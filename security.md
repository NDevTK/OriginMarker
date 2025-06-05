> **Note:** This document outlines the security considerations and mitigations for the OriginMarker extension. It should be reviewed and updated regularly, especially when changes are made to the extension's functionality, dependencies, permissions, or build process, to ensure it accurately reflects the current security posture. This version incorporates findings from additional security research, including an analysis of emerging attack vectors and a deeper review of the provided source code.

# Chrome Extension Security Audit: OriginMarker

## 1. Introduction & Architecture

This document reflects the security state of OriginMarker after an initial audit and subsequent hardening cycles. Recent updates from these review and hardening cycles have further addressed error handling, state consistency, and input validation, and fixed specific bugs related to storage interaction; additional recent hardening has further enhanced robustness through stricter type validation for all critical data retrieved from storage and by applying defensive coding practices for internal data handling.

**Purpose:** The "OriginMarker" Chrome extension provides an origin-dependent marker by changing the title of a designated bookmark to reflect the origin of the currently active tab.

**Main Components:**

- **`manifest.json`:** Defines permissions, CSP, background service worker, and options UI.
- **`background.js` (Service Worker):** Core logic for tracking active tabs, fetching origins, generating markers, and updating bookmarks. This script contains key functions like `setMarker`, `checkOrigin`, `initBookmark`, and the `base2base` encoding algorithm. It is the central processing unit of the extension.
- **`options.html` / `options.js`:** Provides a user interface for extension settings, including a reset function and storage preference settings.
- **`static.js`:** This file is loaded into the service worker via `importScripts('/static.js')`. It is intended to provide static data, notably the `source` (e.g., hex) and `emoji` alphabets used as input for the `base2base` encoding function in `background.js`, and the default `unknown` marker string. Its integrity is crucial. If compromised to contain malicious JavaScript, that code would execute within the service worker's context. If its *data* (alphabets, strings) were manipulated (e.g., `unknown` string replaced with a misleading message or malformed characters), it could lead to incorrect marker generation, broken encoding, or UI display issues if these strings are used directly in the extension's UI without sanitization (though bookmark titles themselves are generally rendered as plain text by the browser). See Section 4.7.

**Key Functionalities:**

- Dynamically updates a specific bookmark's title based on the current tab's URL origin.
- Uses SHA-256 hashing with a unique, randomly generated `salt` (`crypto.randomUUID()`) to create a hash of the origin string concatenated with the salt.
- Employs a `base2base` conversion function, defined within `background.js`, which transforms the hexadecimal hash output into a more visually distinct emoji-based string using alphabets provided by `static.js`.
- Allows users to set custom string markers for specific origins by renaming the designated bookmark.
- Operates in an "auto" mode (emoji markers, title `*`) or "manual" mode (generic marker unless customized, title `**`).
- Supports `http:` and `https:` protocols for origin tracking, as defined in `allowedProtocols`.

### GitHub Actions CI/CD Security

The repository utilizes GitHub Actions for continuous integration and code quality. The security of these workflows is maintained by adhering to the principle of least privilege where possible.

#### Build Workflow (`build.yml`)

The `build.yml` workflow creates build artifacts with `contents: read` permissions, which is appropriate for its task.

#### Formatting Workflow (`format-on-merge.yml`)

The `format-on-merge.yml` workflow handles code formatting on pushes to `main`, using `contents: write` permission to commit changes. This permission level is necessary for its function but presents a potential supply chain risk if the workflow or the actions it uses are compromised.

#### CodeQL Workflow (`codeql.yml`)

The `codeql.yml` workflow performs static code analysis with `security-events: write` (to report findings) and read-only permissions for code access.

---

## 2. Security Analysis & Findings

### Manifest Configuration

- **Permissions (`tabs`, `bookmarks`, `storage`):** Appropriate and necessary for core functionality, adhering to the Principle of Least Privilege.
- **Content Security Policy (CSP):** A strong CSP (`"extension_pages": "default-src 'none'; script-src 'self'; frame-ancestors 'none'; form-action 'none'; upgrade-insecure-requests; block-all-mixed-content"`) is enforced for extension pages (`options.html`), significantly mitigating XSS, clickjacking, and data exfiltration risks from these pages.
- **Other Security Headers:** `cross_origin_embedder_policy` (`require-corp`) and `cross_origin_opener_policy` (`same-origin`) are well-configured, enhancing protection against cross-origin and side-channel attacks for extension pages.

### Salt Management and Storage

The cryptographic `salt` (a `crypto.randomUUID()`) is fundamental to marker generation. It's stored in user-configurable `chrome.storage.sync` (default), `chrome.storage.local`, or `chrome.storage.session`.

- **Storage Security:** While `chrome.storage.sync` and `chrome.storage.local` are not encrypted by Chrome at rest (beyond OS-level user profile encryption), the extension provides storage options and warnings to the user. The risks of salt/marker exfiltration and deanonymization are primarily detailed in Section 4.1 and 4.2.1. Choosing `chrome.storage.session` for the `store` preference means the `salt` (and custom markers) will be cleared when the browser closes, causing auto-generated markers to change with each new browser session; this offers the strongest protection against persistent threats at the cost of marker persistence.
- **Data Validation:** Logic in `background.js` (e.g., in `start()`, `setMode()`) and `options.js` validates the loaded `salt` (ensuring it's a non-empty string, regenerating if invalid or not found) and the storage type preference itself (defaulting to 'sync' if corrupted). Other critical data retrieved from storage (bookmark ID, mode, custom markers) also undergoes strict type validation.

### General Error Handling

- Asynchronous Chrome API calls in `background.js` and `options.js` consistently include `.catch()` handlers for Promises or check `chrome.runtime.lastError` in callbacks, logging errors to `console.error`.
- If the extension fails to initialize its primary bookmark ID (a critical failure during `initBookmark`, such as `onPlaceholder` completing without a valid ID and not being aborted), an "ERR" badge is displayed on the extension icon via `chrome.action.setBadgeText`.
- **Initialization Loop Consideration:** If `setMode` (called within the `onPlaceholder` loop during initialization) consistently fails (e.g., due to persistent storage errors preventing salt/mode saving), `onPlaceholder` may loop indefinitely. In this state, `initBookmark` would not "complete" to trigger the "ERR" badge condition related to `newBookmarkId === undefined`. The extension might remain non-functional, attempting to initialize, until an event like a browser restart or a new call to `start()` (which aborts the previous `initBookmark` attempt) allows the process to terminate or be retried.

### Detailed `background.js` Logic

- **State Consistency:** In-memory state variables are updated carefully. The `initBookmark` process uses an `AbortController` (`currentPlaceholderAbortController`) to manage its asynchronous bookmark setup phase (`onPlaceholder`). This controller is specifically used to gracefully cancel an ongoing `onPlaceholder` operation (which may be waiting for user interaction or specific bookmark events) if `initBookmark` is called again, preventing multiple setup listeners or conflicting flows. `pending_origin` is used in `setMarker` to ensure marker updates correspond to the latest origin check, even across async operations.
- **`onBookmarkChange` Handling:** The `active_origin` is captured at the start of event processing. Bookmark titles ending with `*` are ignored for custom markers. Clearing custom markers is handled, and a debounce mechanism (`bookmarkChangeDebounceTimer`) is used.
- **Internal Message Validation:** Messages received by `chrome.runtime.onMessage` in `background.js` are validated using `sender.origin !== location.origin`.

### Marker Encoding (`base2base`)

- The `base2base` conversion function is defined in `background.js`. It takes alphabets (e.g., hex `source` and `emoji` destination) provided by `static.js` to perform the encoding. Its purpose is for visual distinction and obfuscation of the hash, not for cryptographic security. The underlying SHA-256 hash provides cryptographic strength.
- The `background.js` instantiates `base2base` by passing copies of alphabets (`[...source]`, `[...emoji]`). The `base2base` function itself includes logic (`[...new Set([...alphabet].join(''))]`) to ensure the alphabets it uses internally are composed of unique characters.

---

## 3. UI/UX and User Comprehension Issues

This section describes UI/UX aspects that could have security implications or lead to user misunderstanding.

- **Clarity of Reset Function (`options.html`):**
  - Addressed by updating button text and warning dialogs to clearly communicate the extent of the reset, including salt and marker regeneration.
- **User Awareness of Markers on HTTP Sites:**
  - **Observation:** The extension generates markers for origins from both `http:` and `https:` protocols.
  - **Potential Misunderstanding:** Users might see a familiar marker on an HTTP site and incorrectly perceive the site as secure.
  - **Recommendation:** User education should emphasize that OriginMarker indicates domain authenticity/familiarity but not connection security or website content trustworthiness.

---

## 4. Potential Attack Vectors

This section details potential attack vectors relevant to OriginMarker's code, logic, and core functionality.

### 4.1. Salt Exfiltration and Marker Deanonymization / Spoofing

- **Vulnerability:** The cryptographic `salt` stored unencrypted (beyond OS-level) in `chrome.storage.sync` or `chrome.storage.local` could be exfiltrated by malware or via a compromised Google account (for sync).
- **Impact:** An attacker with the salt and knowledge of the extension's logic could deanonymize auto-generated markers or spoof markers for phishing.
- **Mitigation by Extension Code:**
    - Offering `local` or `session` storage (with `session` clearing salt on browser close) for the salt limits exfiltration risk.
    - Stricter validation of salt format upon retrieval.
    - Client-side encryption of the salt is a potential future mitigation.

### 4.2. Storage Exploitation

#### 4.2.1. Unauthorized Data Access from Storage

- **Vulnerability:** Custom markers and settings stored unencrypted can be read by malware or via a compromised Google account.
- **Impact:** Exposure of user-defined custom marker names and associated origins.
- **Mitigation by Extension Code:**
    - Offering `local` or `session` storage limits sync-based exfiltration.
    - Robust type validation for all retrieved data.
    - Client-side encryption of custom markers is a potential future mitigation.

#### 4.2.2. Storage Quota Exhaustion

- **Vulnerability:** Prolific use of custom markers or errors in writing data could lead to hitting `chrome.storage` quotas.
- **Impact:** Failure to save settings, new custom markers, or the `salt`.
- **Mitigation by Extension Code:**
    - Error handling for storage operations.
    - Debouncing for bookmark change events.

### 4.3. Inter-Extension Communication and Internal IPC

#### 4.3.1. Data Access/Manipulation by Malicious Co-installed Extension

- **Vulnerability:** A co-installed malicious extension with `storage` permission might guess storage keys (e.g., `'_' + hash` for custom markers, where the hash uses a known salt) to access OriginMarker's data.
- **Impact:** Reading sensitive data or altering settings.
- **Mitigation by Extension Code:**
    - Strong CSP for `options.html`.
    - No use of `chrome.runtime.onMessageExternal`.
    - Internal messages checked via `sender.origin === location.origin`.
    - The `_` prefix for hash-based keys is a minor convention, but primary defense relies on limiting salt exposure.

### 4.4. Visual Deception and Input Handling

#### 4.4.1. Invisible Character Injection in Custom Markers (Input)

- **Vulnerability:** Unsanitized bookmark titles (used as custom markers) could contain invisible Unicode characters.
- **Impact:** User confusion or misleading marker appearance.
- **Mitigation by Extension Code:** Planned Unicode normalization and stripping of problematic characters from bookmark titles in `onBookmarkChange`.

### 4.7. Build and Supply Chain Integrity

- **Vulnerability:**
    - **`static.js` Integrity:** Compromise of `static.js` prior to packaging could lead to arbitrary code execution within the service worker via `importScripts()` if malicious JS is injected. If only its *data* (alphabets, `unknown` string) is altered, it could lead to malformed markers, broken encoding, or injection of unsafe strings (e.g., if `unknown` was `"<img src=x onerror=alert(1)>"` and the extension rendered this string as HTML in its options page without sanitization).
    - **GitHub Actions:** The `format-on-merge.yml` workflow with `contents: write` permission is a supply chain risk point.
- **Impact:** Full compromise of the extension, data exfiltration, or malicious actions within its permission scope.
- **Mitigation:**
    - **`static.js`:** Secure maintenance and verification of `static.js` content (both code and data) before packaging. Chrome's extension signing provides some post-publication protection.
    - **GitHub Actions:** Regular review of permissions and dependencies; pinning actions to commit SHAs; branch protection rules.

---

## 5. Code-Level Mitigations & Recommendations

This section outlines existing and planned code-level mitigations in the extension.

### 5.1. Salt, Data Storage, and Cryptography

- **Secure Salt Generation:** `crypto.randomUUID()` used for salt.
- **Storage Options and Validation:** User choice of `local`, `session`, or `sync` storage. Strict type validation on all critical data retrieved from storage.
- **Reset Functionality:** Allows user-initiated salt rotation.
- **Marker Encoding (`base2base`):** Security relies on SHA-256 hash; `base2base` robustly handles alphabets.

### 5.3. Robustness, State, and Event Management

- **Comprehensive Error Handling:** Asynchronous API calls handle errors; critical failures show "ERR" badge.
- **State Consistency and Integrity:** Careful state updates; `AbortController` in `initBookmark` manages re-entrant setup flows. `pending_origin` and `active_origin` capture ensure data correctness. `initializationCompletePromise` defers operations.
- **Event Debouncing and Throttling:**
  - `onBookmarkChange` debounces rapid bookmark title changes.
  - **(Planned Review):** Handling of `chrome.tabs.onUpdated` events in `checkOrigin` (`background.js`) will be reviewed. The goal is to improve efficiency, reduce redundant processing from rapid successive `onUpdated` events (common in SPAs or during redirects), and mitigate the risk of hitting Chrome's internal rate limits for `chrome.bookmarks.update` calls. This is more about performance and robustness than fixing a known data corruption issue, as existing guards in `setMarker` protect marker correctness.
- **Internal IPC Validation:** Messages validated with `sender.origin === location.origin`.

### 5.5. Build and Supply Chain

- **Code Integrity:** Ensuring integrity of all packaged files, especially `static.js` (data and any potential code), is vital.
- **Dependency Management:** `static.js` is local; its data inputs are critical.

---

## 6. Permissions Justification

- **`tabs`:** Required to access active tab URL for origin determination and for tab event listeners.
- **`bookmarks`:** Required for all operations on the designated marker bookmark.
- **`storage`**: Required to store all user settings and custom markers.

---

## 7. Ethical Considerations and Data Handling

- **Data Handling:** Stores data locally or synced by user choice for core functionality; no external transmission by the extension. Reset function clears all extension-stored data.
- **Marker Purpose:** Markers aid origin differentiation, not a guarantee of website security, connection integrity, or content trustworthiness.
- **Transparency:** Open-source project with documented operations.
