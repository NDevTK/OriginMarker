# OriginMarker

![Example of automatic mode using chrome](Chrome.png) ![icon](icon.jpg)

Allows you to easily identify phishing domains with a marker in the bookmarks bar that changes based off the active origin/domain your currently on.
It can be renamed per origin manually or automatic using the hash of the origin encoded in emoji.

# Security Policy

For information on how security is handled in this project, please review our [Security Policy](security.md).

## Introduction

OriginMarker is a Google Chrome extension designed to enhance user security by providing a clear, dynamic visual indicator for the current website's origin (domain). This indicator, displayed as a specially designated bookmark in the bookmarks bar, changes its title (the "marker") based on the site being visited. The primary goal is to help users quickly verify the authenticity of the website they are on and to offer an early warning against potential phishing attacks or misdirection to malicious sites. By making it easier to spot when a domain is not what it seems, OriginMarker aims to add a layer of confidence and security to the browsing experience.

## How it Works

The OriginMarker extension operates through a combination of background scripts that monitor browser activity and manipulate a designated bookmark. Its functionality can be broken down into the following key processes:

1.  **Setup and Initialization:**
    *   The user initializes the extension by creating a new bookmark or renaming an existing one in their bookmarks bar. The title of this bookmark must be set to either `*` (for "Automatic Mode") or `**` (for "Manual Mode").
    *   The extension's background script (`background.js`) detects this specific bookmark creation/rename event. It then stores the ID of this bookmark and the chosen mode (`*` or `**`) in Chrome's storage. This bookmark becomes the dynamic "marker."
    *   If no such bookmark is found, the extension waits for one to be created.

2.  **Origin Tracking:**
    *   The background script listens to various browser events, including tab updates (`chrome.tabs.onUpdated`), tab activation (`chrome.tabs.onActivated`), and window focus changes (`chrome.windows.onFocusChanged`).
    *   These events trigger a function (`checkOrigin`) that retrieves the URL of the currently active tab and extracts its origin (e.g., `https://www.example.com`).

3.  **Marker Generation (`setMarker` function):**
    *   Once the origin is determined, the extension decides what title (marker) to display on the designated bookmark.
    *   **Salt Generation:** For automatic mode, a unique, cryptographically random `salt` (a UUID) is generated and stored if one doesn't already exist. This salt is crucial for ensuring that the generated markers are unique to the user.
    *   **Hashing:** The current origin string is combined with the stored `salt`, and a SHA-256 hash of this combined string is computed.
    *   **Automatic Mode (`*`):**
        *   If no user-defined custom marker exists for the current origin, the SHA-256 hash is encoded into a short, visually distinct string of emojis. This is achieved using a `base2base` conversion function (details in `static.js`), which maps the hexadecimal hash characters to an emoji alphabet.
        *   An asterisk (`*`) is appended to these automatically generated emoji markers to distinguish them from manually set or default markers.
    *   **Manual Mode (`**`):**
        *   If no user-defined custom marker exists for the current origin, a default "unknown" marker (e.g., a generic symbol or placeholder text defined in `static.js`) is displayed.
        *   In this mode, the marker does not automatically change based on the origin's hash unless a custom marker has been previously set.
    *   **Custom Markers:** The system checks if a user has previously set a custom marker for the current origin. If so, this custom marker takes precedence over any automatic or default marker.

4.  **Bookmark Update:**
    *   The title of the designated marker bookmark is updated to display the newly generated or retrieved marker string. This provides immediate visual feedback to the user in the bookmarks bar.

5.  **Custom Marker Functionality (`onBookmarkChange` listener):**
    *   If the user manually renames the marker bookmark while visiting a specific website, the extension captures this change.
    *   The new title provided by the user is then saved in Chrome's storage, associated with the hash of the current website's origin. This becomes a "custom marker."
    *   If the user renames the marker to an empty string, the custom marker for that origin is removed, and it will revert to automatic or default behavior.
    *   This functionality allows users to override the automatic emoji markers with their own descriptive text for specific sites. Changes are debounced to prevent rapid updates.

6.  **Bookmark Deletion (`onBookmarkRemove` listener):**
    *   If the designated marker bookmark is deleted by the user, the extension detects this and attempts to re-initialize the setup process, prompting the user to create a new `*` or `**` bookmark.

## Storage

OriginMarker utilizes Chrome's `chrome.storage` API to persist its settings and data. Users can configure the specific storage area to be used via the extension's options page. The choices are:

*   **`chrome.storage.sync`**: Data is synced across all instances of Chrome where the user is logged in with the same Google account. This is often the default or recommended for user preferences.
*   **`chrome.storage.local`**: Data is stored locally on the user's machine. It persists across browser sessions but is not synced.
*   **`chrome.storage.session`**: Data is stored only for the current browser session and is cleared when the browser closes. (Note: The `bookmark` ID, the `mode`, and the `store` preference itself are saved in `chrome.storage.local`. The chosen `store` preference then determines whether `salt` and custom markers are saved in `chrome.storage.sync`, `chrome.storage.local`, or `chrome.storage.session`.)

The following key pieces of data are stored:

*   **`bookmark` (in `chrome.storage.local`):** The ID of the Chrome bookmark designated to act as the origin marker.
*   **`mode` (in `chrome.storage.local`):** The operational mode selected by the user (`*` for automatic, `**` for manual).
*   **`store` (in `chrome.storage.local`):** The user's selected storage area preference (`'sync'`, `'local'`, or `'session'`) for other data like salt and custom markers.
*   **`salt` (in the area defined by `store`):** A unique UUID generated for the user in Automatic mode. This is used to ensure that the emoji markers generated for origins are unique to that user, enhancing security.
*   **Custom Markers (in the area defined by `store`):** User-defined titles for specific origins. These are stored as key-value pairs, typically mapping an origin's hash (e.g., `_ + sha256(origin + salt)`) to the custom title string.

## Security Aspects

OriginMarker enhances user security in the following ways:

1.  **Visual Verification of Origin:**
    *   The primary security benefit is providing an immediate, persistent, and easily recognizable visual cue for the current website's origin directly in the bookmarks bar. Users can become accustomed to the marker associated with legitimate sites they frequent.
    *   If a user is redirected to a phishing site that looks identical to a real one, the OriginMarker will either be different (if the phisher's domain is different) or show the "unknown" marker/a new auto-generated marker. This discrepancy can alert the user that something is amiss before they enter sensitive information.

2.  **Salted Hashing for Unique Markers:**
    *   In Automatic mode (`*`), the use of a locally generated, unique `salt` when hashing the origin means that the sequence of emojis for any given website will be unique to that user's browser profile.
    *   This makes it significantly harder for an attacker to craft a phishing site that also spoofs the correct OriginMarker emoji sequence, as they would not know the user's salt.

3.  **Difficulty in Spoofing:**
    *   While not impossible, consistently spoofing both the website's appearance and the OriginMarker (especially a salted, auto-generated one) adds a layer of complexity for attackers.

4.  **User-Defined Trust:**
    *   The ability to set custom markers allows users to define their own trusted visual identifiers for sites, further personalizing the security cues.

5.  **Content Security Policy (CSP) and Permissions:**
    *   The extension defines a Content Security Policy and requests minimal necessary permissions (`tabs`, `bookmarks`, `storage`), adhering to good security practices for Chrome extensions to reduce its own attack surface.

It's important to note that OriginMarker is a supplementary security tool. It should be used in conjunction with other security best practices, such as scrutinizing URLs, using password managers, and keeping software updated. It does not replace the need for user vigilance or comprehensive anti-phishing solutions but rather adds an intuitive visual layer of defence.
