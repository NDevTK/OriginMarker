# Origin Marker 🎆
A browser extension to allow users to easily identify phishing domains all done client side.  
With a marker in the bookmarks bar that changes based off the active origin/domain the user is viewing.  
It can be renamed per origin manually or automatic using the hash of the origin encoded in emoji.  
![Example of automatic mode using chrome](Chrome.png) ![Example of automatic mode using firefox](Firefox.png)

# How to setup
Get the extension then create a folder in the bookmarks bar (location of your choice) with the ID of the mode like * it will then automatically get renamed.

# How to use
Rename the folder/marker on the origin or just use Automatic mode.  
When you rename a marker it will not change the mode so you can have a marker named *

# Universal Automatic mode (ID: *)
If no Marker name is set emojis will be used to identify the origin.  
This works by using a sha256 hash of the origin encoded into emoji.

# Personal Automatic mode (ID: **)
Like Universal mode but with a personal salt.
For Origin it will be different emojis then other users. 

# Manual only (ID: ***)
Markers will not get a automatic value.

# Origin
The Origin is based of the protocol, hostname and port number of a URL
