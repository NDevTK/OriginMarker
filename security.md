> **Note:** This document outlines the security considerations and mitigations for the OriginMarker extension. It should be reviewed and updated regularly, especially when changes are made to the extension's functionality, dependencies, permissions, or build process, to ensure it accurately reflects the current security posture. This version incorporates findings from additional security research, including an analysis of emerging attack vectors and a deeper review of the provided source code.

# Chrome Extension Security Audit: OriginMarker

## 1. Introduction & Architecture

This document reflects the security state of OriginMarker after multiple hardening cycles. OriginMarker is a Manifest V3 extension, leveraging a service worker (`background.js`) for its core operations. This aligns with modern Chrome extension security principles such as event-driven processing and non-persistent background execution.

**Purpose:** The "OriginMarker" Chrome extension provides an origin-dependent marker by changing the title of a designated bookmark to reflect the origin of the currently active tab.

**Main Components:**

- **`manifest.json`:** Defines permissions, a restrictive Content Security Policy (CSP), the background service worker, and the options UI.
- **`background.js` (Service Worker):** The core logic for tracking tabs, fetching origins, generating markers, and updating bookmarks. It contains key functions like `setMarker`, `checkOrigin`, `initBookmark`, and the `base2baseForEmojis` encoding algorithm.
- **`static.js`:** Loaded via `importScripts`, this file provides static data: the `source` (hex) and `emoji` alphabets, and the default `unknown` marker string. Its integrity is paramount, as a compromise in the developer's environment could lead to arbitrary code execution.

---

## 2. Cryptographic and Encoding Integrity

### 2.1. Hashing and Salting

The extension's security model is founded on using a salted hash to generate markers.

- **Algorithm:** It uses SHA-256 to hash the combination of the page's origin and a user-specific salt (`origin + salt`). SHA-256 is a standard, secure hashing algorithm with no known practical collision vulnerabilities.
- **Salt:** A cryptographically strong, unique `salt` is generated for each user via `crypto.randomUUID()` and stored. This ensures that the same origin will produce a different marker for different users, preventing an attacker from creating a universal phishing page that spoofs the marker for everyone.

### 2.2. Marker Encoding and Collision Resistance

- **Encoding:** The 256-bit (64-character hexadecimal) SHA-256 hash is converted into a sequence of emojis by the `base2baseForEmojis` function. This function treats each emoji in the `emoji` array from `static.js` as a distinct token in a high-base numbering system.
- **Visual Prefix Collision:** While the full marker is long, users will typically only see a truncated prefix in the bookmarks bar (e.g., the first 6-8 emojis). The probability of two different origins randomly producing the same visual prefix is exceptionally low. Given an alphabet of over 300 unique emojis, the number of possible permutations for a 6-emoji prefix is over 729 trillion (`300^6`). This makes an accidental visual collision astronomically unlikely. An attacker cannot feasibly find a new malicious domain whose origin, when hashed with the user's salt, produces the same visual prefix as a legitimate site.

---

## 3. Threat Model & Attack Vectors

### 3.1. Salt Exfiltration and Post-Compromise Analysis

- **Vulnerability:** The primary threat is the exfiltration of the user's `salt`, which is stored unencrypted in `chrome.storage`. This could occur via local malware reading browser files or through a compromised Google account if `sync` storage is used.
- **Impact & Post-Compromise Scenario:** An attacker who obtains the `salt` can undermine the extension's security for that specific user.
  1.  **Marker Spoofing:** The attacker can pre-compute the correct emoji marker for any phishing domain they control, making it appear legitimate to the victim.
  2.  **History Deanonymization:** An attacker could build a rainbow table by hashing a list of common domains with the compromised `salt`. By comparing observed emoji markers (e.g., from screenshots or other data breaches) against this table, they could determine which specific websites the user has visited.
- **Mitigation:**
  - The extension offers `chrome.storage.session` as a storage choice, which clears the `salt` on browser close, providing strong protection against persistent threats at the cost of marker persistence.
  - Core settings (`bookmark` ID, `mode`) are always stored in `chrome.storage.local`, limiting the impact of a `sync` storage compromise.
  - A full `Reset` function allows for manual salt rotation.

### 3.2. Visual Deception and User Habituation

- **Custom Marker Sanitization:** When a user sets a custom marker by renaming the bookmark, the input is rigorously sanitized in the `onBookmarkChange` handler.
  - The code normalizes Unicode (`normalize('NFC')`) and explicitly strips invisible characters and control codes using a regular expression (`[\u200B-\u200D\u202A-\u202E\u2066-\u2069\uFEFF]/gu`).
  - Crucially, the code checks if the _sanitized_ title is empty. This means a title consisting only of stripped invisible characters will be correctly treated as an empty string, causing the custom marker to be removed rather than saved. This is a robust defense against creating visually empty but functionally present custom markers.
- **User Habituation Risk:** A significant, non-technical risk is user habituation. Users may learn to trust the _presence_ of a marker as a sign of safety, rather than actively verifying its content. This learned trust can be exploited if an attacker manages to spoof a marker. The extension should be viewed as a supplementary tool, not a replacement for vigilance.

### 3.3. Build and Supply Chain Integrity

- **`static.js` as a Trust Boundary:** The `background.js` script imports `static.js` directly. This makes the `static.js` file a critical trust boundary. If this file is compromised in the developer's environment or build pipeline before being packaged, it can lead to full extension compromise with no further exploits needed.
- **Dev-Dependency Risk:** The use of a code formatter in the CI/CD pipeline implies `npm` dev dependencies. A compromised dev dependency (e.g., a malicious version of a linter or formatter) could alter source code during the build process, injecting a backdoor into the final packaged extension.
- **Mitigation:**
  - **Developer Responsibility:** The developer is responsible for maintaining a secure build environment and verifying the integrity of all first-party files and dependencies.
  - **Dependency Pinning:** The project pins its GitHub Actions to specific commit SHAs to mitigate risks from compromised third-party actions.

---

## 4. Code-Level Security & Robustness

### 4.1. Asynchronous State Management

The extension demonstrates robust handling of asynchronous operations to prevent race conditions.

- **Initialization (`initBookmark`):** Uses an `AbortController` to gracefully cancel pending setup operations if the function is re-triggered, ensuring that only one initialization process is active at a time.
- **Stale Marker Prevention (`setMarker`):** Caches the `origin` in a `pending_origin` variable at the start of the function and verifies it hasn't changed after asynchronous storage calls, preventing a delayed operation from setting the marker for a stale origin.
- **Custom Marker Association (`onBookmarkChange`):** Captures `active_origin` into a local constant (`eventOrigin`) at the moment the event is handled. This constant is then used inside the `setTimeout` debounce callback, ensuring the custom title is always associated with the origin that was active when the user _initiated_ the change, not when the timer fired.

### 4.2. Event-Based DoS Protection

- **Concern:** A malicious page could fire rapid tab events to trigger constant marker recalculations, leading to high CPU usage and making the extension unresponsive.
- **Mitigation:** The extension implements a rate-limiter with a dynamic cooldown mechanism.
  - **Throttling:** The `handleTabEventThrottled` function tracks event timestamps and detects when they exceed a defined threshold (`EVENT_RATE_THRESHOLD_COUNT` within `EVENT_RATE_THRESHOLD_WINDOW_MS`).
  - **Cooldown and Recovery:** When a DoS attempt is detected, the extension enters a `DOS_STATE_COOLDOWN`, displays a "BUSY" badge, and ignores further events for an initial period (`DOS_INITIAL_COOLDOWN_MS`). If the event storm persists, the cooldown is extended (`DOS_EXTENDED_COOLDOWN_MS`); otherwise, it recovers to normal operation. This ensures graceful degradation and recovery.

### 4.3. Data Validation

- **Alphabet Integrity:** At startup, the code validates that the alphabets imported from `static.js` meet minimum length requirements (`MIN_ALPHABET_LENGTH`, `MIN_EMOJI_ALPHABET_LENGTH`). If not, auto-mode is disabled, preventing errors in the encoding function.
- **URL Parsing:** The `checkOrigin` function wraps URL parsing in a `try/catch` block and validates the protocol is in `allowedProtocols` (`https:`, `http:`), preventing errors from invalid URLs and ignoring potentially unsafe schemes.

### 4.4. Internal Message Validation

Messages passed between the extension's own components (e.g., from the options page `options.js` to the service worker `background.js`) are validated to ensure they originate from the extension itself. This is achieved by the service worker verifying that the `sender.origin` of an incoming message is identical to its own `self.origin` (or `location.origin`). This check effectively prevents the service worker from processing messages sent by content scripts (which would have the origin of the web page they are injected into) or other extensions, ensuring that handlers for internal messages are not improperly triggered.

---

## 5. Future Hardening & Recommendations

- **Client-Side Salt Encryption:** To raise the bar for salt exfiltration, a future version could encrypt the `salt` before storing it. An encryption key could be derived from a user-provided password via a strong KDF like Argon2, with the derived key held only in memory.
- **Dedicated Salt Rotation:** A non-destructive "Rotate Salt" feature would improve usability by allowing users to invalidate a potentially compromised salt without deleting all their custom-set markers.
- **UI-Level Context:** To counter user habituation, the extension popup could provide more context about the current marker, such as the date it was first generated or last changed, to help users make more informed judgments.
