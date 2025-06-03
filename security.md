> **Note:** This document outlines the security considerations and mitigations for the OriginMarker extension. It should be reviewed and updated regularly, especially when changes are made to the extension's functionality, dependencies, permissions, or build process, to ensure it accurately reflects the current security posture. This version incorporates findings from additional security research, including an analysis of emerging attack vectors.

# Chrome Extension Security Audit: OriginMarker

## 1. Introduction & Architecture

This document reflects the security state of OriginMarker after an initial audit and subsequent hardening cycles. Recent updates from these review and hardening cycles have further addressed error handling, state consistency, and input validation, and fixed specific bugs related to storage interaction; additional recent hardening has further enhanced robustness through stricter type validation for all critical data retrieved from storage and by applying defensive coding practices for internal data handling (such as for marker encoding alphabets).

**Purpose:** The "OriginMarker" Chrome extension provides an origin-dependent marker by changing the title of a designated bookmark to reflect the origin of the currently active tab.

**Main Components:**

- **`manifest.json`:** Defines permissions, CSP, background service worker, and options UI.
- **`background.js` (Service Worker):** Core logic for tracking active tabs, fetching origins, generating markers, and updating bookmarks.
- **`options.html` / `options.js`:** Provides a user interface for extension settings, including a reset function.
- **`static.js`:** Contains static data like the character sets for marker encoding.

**Key Functionalities:**

- Dynamically updates a specific bookmark's title based on the current tab's URL origin.
- Uses SHA-256 hashing with a unique, randomly generated `salt` to create a hash of the origin.
- Employs a custom `base2base` conversion function to transform the hexadecimal hash output into a more visually distinct emoji-based string for automatic markers.
- Allows users to set custom string markers for specific origins.
- Operates in an "auto" mode (emoji markers) or "manual" mode (generic marker unless customized).

### GitHub Actions CI/CD Security

The repository utilizes GitHub Actions for continuous integration and code quality. The security of these workflows is maintained by adhering to the principle of least privilege. The `format-on-merge.yml` workflow has `contents: write` permission, presenting a potential supply chain risk if compromised.

#### Build Workflow (`build.yml`)

The `build.yml` workflow creates build artifacts with `contents: read` permissions.

#### Formatting Workflow (`format-on-merge.yml`)

The `format-on-merge.yml` workflow handles code formatting on pushes to `main`, using `contents: write` permission to commit changes. This is a critical point in the supply chain.

#### CodeQL Workflow (`codeql.yml`)

The `codeql.yml` workflow performs static code analysis with `security-events: write` and read-only permissions.

---

## 2. Security Analysis & Findings

### Manifest Configuration

- **Permissions (`tabs`, `bookmarks`, `storage`):** Appropriate and necessary for core functionality, adhering to the Principle of Least Privilege.
- **Content Security Policy (CSP):** A strong CSP (`"extension_pages": "default-src 'none'; script-src 'self'; frame-ancestors 'none'; form-action 'none'; upgrade-insecure-requests; block-all-mixed-content"`) is enforced for extension pages, mitigating XSS and clickjacking.
- **Other Security Headers:** `cross_origin_embedder_policy` (`require-corp`) and `cross_origin_opener_policy` (`same-origin`) are well-configured, enhancing protection against cross-origin and side-channel attacks.

### Salt Management and Storage

The cryptographic `salt` (a `crypto.randomUUID()`) is fundamental to marker generation. It's stored in user-configurable `chrome.storage.sync` (default), `chrome.storage.local`, or `chrome.storage.session`.

- **Storage Security:** While `chrome.storage.sync` and `chrome.storage.local` are not encrypted by Chrome (posing risks if the user's profile or Google account is compromised), the extension provides storage options and warnings to the user. The risks of salt/marker exfiltration and deanonymization are primarily detailed in Section 4.1 and 4.2.1.
- **Data Validation:** Logic in `background.js` and `options.js` validates the loaded `salt` (ensuring it's a non-empty string, regenerating if invalid) and the storage type preference itself, defaulting to 'sync' if corrupted. Other critical data from storage (bookmark ID, mode, custom markers) also undergoes type validation. This enhances robustness against corrupted configuration or data.

### General Error Handling

- Asynchronous Chrome API calls (e.g., `chrome.bookmarks.update`, `chrome.storage.sync.set`) in `background.js` and `options.js` include `.catch()` handlers or `chrome.runtime.lastError` checks, logging errors to `console.error`.
- If the extension fails to initialize its primary bookmark ID (a critical failure), an "ERR" badge is displayed on the extension icon.

### Detailed `background.js` Logic

- **State Consistency:** In-memory state variables (`salt`, `mode`, `bookmark`) are updated only _after_ corresponding storage operations complete successfully, preventing divergence between runtime and persisted state. The `initBookmark` process uses an `AbortController` to prevent race conditions during setup from rapid re-entry.
- **`onBookmarkChange` Handling:**
  - The `active_origin` is captured at the start of event processing to prevent using stale data when saving custom markers.
  - Bookmark titles ending with an asterisk (`*`) are intentionally ignored for custom marker creation to distinguish from auto-generated markers.
  - Clearing custom markers (by setting bookmark title to empty) is handled by a `removeData(key)` function that respects the user-configured storage type.

### Marker Encoding (`base2base`)

- The `base2base` conversion (hex to emoji) in `static.js` is for visual distinction and obfuscation, not cryptographic security. The underlying SHA-256 hash provides cryptographic strength.
- The algorithm is a standard implementation. Defensive copies of alphabets are used during initialization in `background.js`.

---

## 3. UI/UX and User Comprehension Issues

This section describes UI/UX issues that had direct, code-fixable security implications and have been **ADDRESSED**.

- **Clarity of Reset Function (`options.html`):**
  - **Issue:** The "Reset" button's original text and behavior did not adequately convey that it cleared the cryptographic `salt` (which changes all auto-generated markers) and necessitated a full re-setup of the extension.
  - **Risk:** Users could inadvertently click the reset button without understanding the full implications, potentially leading to a loss of their established security markers and requiring re-initialization. If the user failed to correctly re-initialize, or misinterpreted the state of the extension after an accidental reset, it could lead to a temporarily weakened security posture.
  - **Fix:** The button text and associated warning dialogs were updated in `options.js` and `options.html` to clearly communicate the extent of the reset operation, including the salt and marker regeneration. This was addressed as part of UI clarity enhancements (see Section 5).

---

## 4. Potential Attack Vectors

This section details potential attack vectors relevant to OriginMarker's code, logic, and core functionality, focusing on those that are reasonably likely and can be meaningfully mitigated by changes to the extension's code.

### 4.1. Salt Exfiltration and Marker Deanonymization / Spoofing

- **Vulnerability:** The cryptographic `salt` is stored in `chrome.storage.sync` (default) or `chrome.storage.local`. Since these storage areas are not encrypted by Chrome, malware with local system access or a compromised Google account (for sync) could lead to salt exfiltration.
- **Impact:** An attacker with the salt and knowledge of the extension's logic (public) could deanonymize auto-generated markers or spoof markers for phishing.
- **Mitigation by Extension Code:** While full prevention of host compromise is outside the extension's scope, the extension offers `local` or `session` storage for the salt to limit cross-device exfiltration. Stricter validation of salt format upon retrieval from storage has been implemented. Client-side encryption of the salt before storing it is a potential code mitigation (though currently deferred).

### 4.2. Storage Exploitation

#### 4.2.1. Unauthorized Data Access from Storage

- **Vulnerability:** Similar to salt exfiltration, custom markers and extension settings stored unencrypted in `chrome.storage.local` or `chrome.storage.sync` can be read by malware with appropriate access or via a compromised Google account.
- **Impact:** Exposure of user-defined custom marker names and their associated origins.
- **Mitigation by Extension Code:** Offering `local` or `session` storage limits sync-based exfiltration. Client-side encryption of custom markers is a potential code mitigation (currently deferred). Robust type validation for all data retrieved from storage has been implemented.

#### 4.2.2. Storage Quota Exhaustion

- **Vulnerability:** The extension's use of `chrome.storage.sync` (limit ~100KB, 512 items) or `chrome.storage.local` (~10MB) could be targeted. If the extension does not handle storage write failures gracefully, or if its own operations are excessively verbose without checks, it could contribute to or suffer from quota exhaustion.
- **Impact:** Failure to save settings, custom markers, or the `salt`, degrading functionality.
- **Mitigation by Extension Code:** The extension implements error handling for storage operations. Debouncing for bookmark change events (`onBookmarkChange`) mitigates rapid writes for custom markers. Further code changes could involve more proactive monitoring of `getBytesInUse` or more aggressive data validation/slimming if this becomes an issue. (See also 4.7).

### 4.3. Inter-Extension Communication and Internal IPC

#### 4.3.1. Data Access/Manipulation by Malicious Co-installed Extension

- **Vulnerability:** A co-installed malicious extension with the generic `storage` permission could potentially attempt to read or modify OriginMarker's data in `chrome.storage` if it can guess the storage keys. A highly privileged malicious extension (e.g., with devtools access or exploiting a browser flaw) could inspect or manipulate OriginMarker's `options.html` DOM.
- **Impact:** Reading sensitive data like salt or custom markers, or altering settings to disable or mislead.
- **Mitigation by Extension Code:** OriginMarker uses a strong CSP for its pages. It does not use `chrome.runtime.onMessageExternal`. Internal use of `chrome.storage` is standard; client-side encryption (deferred) would be a code-level defense. Defensive coding practices for `options.js` can harden it against DOM manipulation to some extent.

#### 4.3.2. Denial of Service via Rapid Bookmark Updates (Handled by Extension)

- **Vulnerability:** Frequent changes to the designated bookmark's title by another extension or rapid manual edits could trigger numerous `onBookmarkChange` events.
- **Impact:** Potential `chrome.storage.sync` rate limit exhaustion if not handled, preventing custom marker saves.
- **Mitigation by Extension Code:** This is **ADDRESSED**. Debouncing logic in `onBookmarkChange` in `background.js` mitigates this by limiting processing frequency.

#### 4.3.3. Internal Inter-Process Communication (IPC)

- **Context:** OriginMarker's primary IPC is between `options.js` and `background.js` via `chrome.storage` (for persisting settings) and `chrome.runtime.sendMessage` (for immediate actions like reset).
- **Vulnerability:** While Chrome provides isolation, any vulnerabilities in how the extension manages data serialization, validation, or state based on these internal messages could be theoretically probed if another part of the extension were compromised.
- **Mitigation by Extension Code:** Data retrieved from storage by `background.js` and `options.js` undergoes type validation. Message handling logic should be kept simple and also validate inputs if complex data were passed (currently, messages are simple triggers).

### 4.4. Visual Deception and Input Handling

#### 4.4.1. Invisible Character Injection in Custom Markers

- **Vulnerability:** If the extension's input fields in `options.html` and the logic in `options.js` or `background.js` do not sanitize custom marker strings, a user could be tricked into saving a marker with invisible Unicode characters.
- **Impact:** These could be used for covert data encoding or potentially to evade naive string matching if such were used (not currently an issue).
- **Mitigation by Extension Code:** Implementing Unicode normalization and stripping/disallowing known problematic invisible characters from custom marker strings in `options.js` before saving to storage.

#### 4.4.2. Perceptual Collisions or Ambiguity in Auto-Generated Emoji Markers

- **Vulnerability:** The `base2base` function in `static.js` converts cryptographic hashes to emoji sequences. If the chosen emoji alphabet or the conversion logic itself inadvertently increases the likelihood of visually similar outputs for different inputs (beyond what's expected from random chance with the given alphabet size), it's an issue with the extension's generation algorithm.
- **Impact:** Reduced visual distinctiveness of markers, potentially leading to user confusion. This is distinct from general user misinterpretation if the algorithm itself is sound.
- **Mitigation by Extension Code:** Review and refinement of the `emoji` alphabet in `static.js` and the `base2base` logic to ensure it produces good visual differentiation. Defensive copying of alphabets is already implemented.

### 4.5. Race Conditions and Time-of-Check to Time-of-Use (TOCTOU)

#### 4.5.1. Race Conditions in Asynchronous Operations

- **Vulnerability:** The extension heavily uses asynchronous Chrome APIs (e.g., for tab updates, storage access, bookmark changes). Logic flaws in how `background.js` handles the sequence of these operations, especially with rapid events (e.g., quick tab navigation, multiple bookmark modifications), could lead to incorrect marker display, stale data usage, or inconsistent state. For instance, processing a tab update for a URL that has already changed again before the first update completes.
- **Impact:** Display of incorrect or misleading markers, failure to save data correctly, or internal state corruption.
- **Mitigation by Extension Code:** Careful management of asynchronous operations in `background.js` and `options.js`. Capturing relevant state (like `active_origin`) at the start of an event handler, using `AbortController` to manage re-entrant functions like `initBookmark`, and potentially more robust event debouncing/throttling for `tabs.onUpdated` events. Ensuring state is re-verified before critical actions if it could have changed.

#### 4.5.2. TOCTOU Exploits in Extension State

- **Vulnerability:** Similar to general race conditions, if the extension's code checks a state (e.g., current `mode` or `bookmark` ID from storage) and then acts upon it later, the state might change in between due to another asynchronous operation or user interaction via the options page.
- **Impact:** Operations being performed with outdated assumptions, potentially leading to incorrect behavior (e.g., updating the wrong bookmark, applying a marker based on an old mode).
- **Mitigation by Extension Code:** Atomicity of `chrome.storage` operations for single key updates helps. For multi-step processes, re-fetching or re-validating critical state variables from storage or in-memory state immediately before use, or using transactional-like patterns if state changes are complex. Ensuring in-memory state is correctly updated only after storage operations succeed.

### 4.6. Information Loss in Base Conversion (Marker Encoding)

- **Vulnerability:** The `base2base` function in `static.js` converts a hexadecimal hash to a sequence of emojis. If this conversion process itself is flawed (e.g., biased character selection, off-by-one errors in mapping, significant loss of entropy beyond alphabet size reduction), it could lead to a less effective distribution of markers, potentially increasing actual (not just perceptual) collisions or making the output less representative of the hash.
- **Impact:** Reduced uniqueness or security of the visual markers if the conversion is cryptographically weak, independent of the strength of SHA-256.
- **Mitigation by Extension Code:** The `base2base` algorithm has been reviewed and found to be a standard, logically sound implementation for its purpose (visual differentiation). The primary concern remains perceptual collisions (4.4.2) rather than a cryptographic flaw in `base2base` itself.

### 4.7. Granular Denial of Service via Custom Marker Item Limits

- **Vulnerability:** If a user creates a very large number of unique custom markers (approaching `chrome.storage.sync`'s 512-item limit), the extension might fail to save new markers or critical settings (like `salt` or `mode`) if it doesn't handle storage write failures or potential item limit errors gracefully.
- **Impact:** Inability to save new custom markers or update extension configuration.
- **Mitigation by Extension Code:** Robust error handling for `chrome.storage.set` operations (already improved). Potentially, the extension could implement internal tracking of item count (via `chrome.storage.sync.getBytesInUse` which can also return item count) and warn the user or implement specific rate limiting for _new_ custom marker creations if this becomes a practical issue.

---

## 5. Code-Level Mitigations & Recommendations

This section outlines existing and planned code-level mitigations in the extension, corresponding to the potential attack vectors identified in Section 4. It focuses on mitigations that are implemented through code changes within the extension itself and address retained attack vectors.

### 5.1. Salt, Data Storage, and Cryptography (Addresses Retained Risks 4.1, 4.2.1, 4.6)

- **Secure Salt Generation:** The cryptographic `salt` is generated using `crypto.randomUUID()` in `background.js`. This ensures a strong, unique identifier per installation, crucial for preventing predictable markers.
- **Storage Options and Validation:**
  - Users can select `local`, `session`, or `sync` storage for the `salt` and other extension data via `options.html` (interaction logic in `options.js`). This choice allows users to balance convenience with the risk of salt exfiltration (e.g., `local` storage limits exposure if a Google account is compromised).
  - The `salt` value retrieved from `chrome.storage` by `background.js` is validated to be a non-empty string and is regenerated if found invalid. The chosen storage type preference (also stored) is similarly validated to prevent corruption.
  - User guidance on the security implications of storage choices is provided directly within `options.html`.
- **Reset Functionality:** The "Clear All Extension Data" button in `options.html` (with logic in `options.js`) triggers a modal dialog. This dialog clearly communicates that the action clears all settings, custom markers, and, critically, the `salt`, which results in the regeneration of all automatic markers. This serves as a user-initiated salt rotation mechanism.
- **Marker Encoding (`base2base`):** The `base2base` algorithm in `static.js` (used by `background.js`, which employs defensive copies of alphabets) has been reviewed. It's a standard implementation for converting cryptographic SHA-256 hashes to emoji sequences, primarily for visual differentiation. Its security relies on the underlying hash. The algorithm and alphabet have been reviewed for logical soundness.

### 5.2. Input Handling and Marker Appearance (Addresses Retained Risks 4.4.1, 4.4.2)

- **Emoji Alphabet Curation:** The `emoji` list in `static.js` (used by `base2base`) has been curated. This aims to improve visual distinctiveness between markers and remove symbols that might be easily misinterpreted as security icons, which helps mitigate perceptual collisions (ref: 4.4.2).
- **Custom Marker Sanitization (Planned):** To address the risk of invisible character injection in custom markers (ref: 4.4.1), input validation logic in `options.js` (handling input from `options.html`) and `background.js` (before saving to `chrome.storage`) is planned to be updated. This will include Unicode normalization (NFC) and the stripping or disallowing of known problematic invisible characters.

### 5.3. Robustness, State, and Event Management (Addresses Retained Risks 4.2.2, 4.3.2, 4.3.3, 4.5.1, 4.5.2, 4.7)

- **Comprehensive Error Handling:** Asynchronous Chrome API calls in `background.js` and `options.js` use `.catch()` for Promises or `chrome.runtime.lastError` checks for direct callbacks. Errors are logged to `console.error` for diagnostic purposes. Critical initialization failures (e.g., bookmark ID issues) trigger an "ERR" badge on the extension icon (logic in `background.js`, badge set via `chrome.action.setBadgeText`).
- **State Consistency and Integrity:**
  - In-memory state variables (`salt`, `mode`, `bookmark` in `background.js`) are updated only _after_ corresponding `chrome.storage` operations succeed.
  - `initBookmark` and `onPlaceholder` functions in `background.js` use an `AbortController` to manage and prevent race conditions during setup.
  - The `onBookmarkChange` handler in `background.js` captures `active_origin` at the start of processing to ensure custom markers are associated with the correct origin.
- **Event Debouncing and Throttling:**
  - The `onBookmarkChange` handler in `background.js` debounces rapid bookmark title changes, mitigating DoS (ref: 4.3.2) and storage quota issues (refs: 4.2.2, 4.7).
  - **(Planned):** Handling of `chrome.tabs.onUpdated` events in `checkOrigin` (`background.js`) will be reviewed for improved efficiency (e.g., filtering/debouncing) against rapid tab updates, further mitigating race conditions (ref: 4.5.1).
- **Internal IPC Data Validation:** Data passed between `options.js` and `background.js` via `chrome.storage` is subject to type validation upon retrieval by `background.js` (ref: 4.3.3).

### 5.4. Manifest Security (Addresses Retained Risk 4.3.1)

- **Content Security Policy (CSP):** A strong CSP is defined in `manifest.json` (`default-src 'none'; script-src 'self'; frame-ancestors 'none';`) to protect extension pages like `options.html` from XSS and limit DOM manipulation risks from other extensions.

---

## 6. Permissions Justification

The extension requests the following permissions, all of which are **necessary** for its intended operation and adhere to the Principle of Least Privilege:

- **`tabs`:** Required to access the URL of the currently active tab to determine its origin for marker generation.
- **`bookmarks`:** Required to create, read, and update the designated bookmark used for displaying the origin marker.
- **`storage`** (`local` and `sync`): Required to store user settings (e.g., mode, `salt`, bookmark ID) and custom markers defined by the user.

---

## 7. Ethical Considerations and Data Handling

- **Data Handling:** OriginMarker stores data (cryptographic `salt`, custom marker definitions, operational mode, and the ID of its designated bookmark) either locally on the user's device or synchronized via `chrome.storage.sync`, based on user configuration. This data is used solely for the extension's core function of providing origin differentiation and is never transmitted externally by the extension itself. Users can clear all stored data using the reset function in the options.
- **Marker Purpose:** The visual markers (automatic or custom) generated by this extension serve for origin differentiation to help users identify the current website. They do not imply or guarantee the security or trustworthiness of the website's content or operations.
- **Transparency:** OriginMarker is an open-source project, allowing public review of its code and security logic. Key aspects of its operation, such as data storage, marker generation, and security features, are documented.
