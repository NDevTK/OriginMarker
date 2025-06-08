'use strict';
const unknown = 'Marker';

const emoji = [
  '😀', // Grinning Face
  '😂', // Face with Tears of Joy
  '🤔', // Thinking Face
  '😴', // Sleeping Face
  '😷', // Face with Medical Mask
  '🤯', // Exploding Head
  '🥶', // Cold Face
  '🥵', // Hot Face
  '🤮', // Face Vomiting
  '🤫', // Shushing Face
  '🤗', // Hugging Face
  '🤑', // Money-Mouth Face
  '🤪', // Zany Face
  '😇', // Smiling Face with Halo
  '😍', // Smiling Face with Heart-Eyes
  '💀', // Skull
  '💩', // Pile of Poo
  '🤡', // Clown Face
  '👹', // Ogre
  '👺', // Goblin
  '👻', // Ghost
  '👽', // Alien
  '🤖', // Robot
  '😺', // Grinning Cat
  '😻', // Smiling Cat with Heart-Eyes
  '🙈', // See-No-Evil Monkey
  '🙉', // Hear-No-Evil Monkey
  '🙊', // Speak-No-Evil Monkey
  '💋', // Kiss Mark
  '❤️', // Red Heart
  '💯', // Hundred Points Symbol
  '💥', // Collision Symbol
  '💫', // Dizzy Symbol
  '💨', // Dashing Away
  '💣', // Bomb
  '💬', // Speech Balloon
  '👁️‍🗨️', // Eye in Speech Bubble
  '🗯️', // Right Anger Bubble
  '💭', // Thought Balloon
  '💤', // Zzz
  '👋', // Waving Hand
  '👍', // Thumbs Up
  '👎', // Thumbs Down
  '🙏', // Folded Hands
  '💪', // Flexed Biceps
  '👌', // OK Hand
  '✌️', // Victory Hand
  '👆', // Backhand Index Pointing Up
  '👇', // Backhand Index Pointing Down
  '👈', // Backhand Index Pointing Left
  '👉', // Backhand Index Pointing Right
  '✊', // Raised Fist
  '👏', // Clapping Hands
  '🙌', // Raising Hands
  '✍️', // Writing Hand
  '💅', // Nail Polish
  '🤳', // Selfie
  '🦾', // Mechanical Arm
  '🦿', // Mechanical Leg
  '🧠', // Brain
  '👀', // Eyes
  '👂', // Ear
  '👃', // Nose
  '👅', // Tongue
  '👄', // Mouth
  '🦷', // Tooth
  '🦴', // Bone
  '👶', // Baby
  '👦', // Boy
  '👧', // Girl
  '👨', // Man
  '👩', // Woman
  '👴', // Old Man
  '👵', // Old Woman
  '👮', // Police Officer
  '👷', // Construction Worker
  '🤴', // Prince
  '👸', // Princess
  '🎅', // Santa Claus
  '🦸', // Superhero
  '🧟', // Zombie
  '🚶', // Person Walking
  '🏃', // Person Running
  '💃', // Woman Dancing
  '🕺', // Man Dancing
  '👪', // Family
  '🗣️', // Speaking Head
  '👤', // Bust in Silhouette
  '👥', // Busts in Silhouette
  '🫂', // People Hugging
  '👣', // Footprints
  '🐒', // Monkey
  '🐶', // Dog Face
  '🐱', // Cat Face
  '🐅', // Tiger
  '🐘', // Elephant
  '🐍', // Snake
  '🐠', // Tropical Fish
  '🐝', // Honeybee
  '🕷️', // Spider
  '🦋', // Butterfly
  '🦖', // T-Rex
  '🐧', // Penguin
  '🦉', // Owl
  '🐢', // Turtle
  '🐙', // Octopus
  '🦀', // Crab
  '🦐', // Shrimp
  '🐎', // Horse
  '🐄', // Cow
  '🐖', // Pig
  '🐑', // Ewe
  '🐐', // Goat
  '🐪', // Dromedary Camel
  '🐺', // Wolf
  '🦊', // Fox
  '🐻', // Bear
  '🐼', // Panda
  '🐸', // Frog
  '🐊', // Crocodile
  '🦈', // Shark
  '🐌', // Snail
  '🐜', // Ant
  '🐞', // Lady Beetle
  '🦠', // Microbe
  '💐', // Bouquet
  '🌹', // Rose
  '🌻', // Sunflower
  '🌳', // Deciduous Tree
  '🌵', // Cactus
  '🍁', // Maple Leaf
  '🍇', // Grapes
  '🍎', // Red Apple
  '🍌', // Banana
  '🍍', // Pineapple
  '🍓', // Strawberry
  '🥑', // Avocado
  '🌶️', // Hot Pepper
  '🍄', // Mushroom
  '🍞', // Bread
  '🧀', // Cheese Wedge
  '🍔', // Hamburger
  '🍕', // Pizza
  '🥚', // Egg
  '🍿', // Popcorn
  '🍦', // Soft Ice Cream
  '🎂', // Birthday Cake
  '🍫', // Chocolate Bar
  '🍬', // Candy
  '🍯', // Honey Pot
  '☕', // Hot Beverage
  '🍷', // Wine Glass
  '🍺', // Beer Mug
  '🥢', // Chopsticks
  '🔪', // Kitchen Knife
  '🌍', // Earth Globe Europe-Africa
  '🗺️', // World Map
  '🌋', // Volcano
  '🏠', // House
  '🏢', // Office Building
  '🏥', // Hospital
  '🏦', // Bank
  '🏰', // Castle
  '🗼', // Tokyo Tower
  '🗽', // Statue of Liberty
  '🚂', // Locomotive
  '🚌', // Bus
  '🚗', // Automobile
  '🏍️', // Motorcycle
  '🚲', // Bicycle
  '⚓', // Anchor
  '⛵', // Sailboat
  '🚢', // Ship
  '✈️', // Airplane
  '🚁', // Helicopter
  '🚀', // Rocket
  '🛸', // Flying Saucer
  '⌛', // Hourglass Done
  '⏰', // Alarm Clock
  '🌙', // Crescent Moon
  '☀️', // Sun
  '⭐', // Star
  '☁️', // Cloud
  '⚡', // High Voltage
  '❄️', // Snowflake
  '🔥', // Fire
  '💧', // Droplet
  '🌊', // Water Wave
  '🎃', // Jack-O-Lantern
  '🎄', // Christmas Tree
  '🎆', // Fireworks
  '🎉', // Party Popper
  '🏆', // Trophy
  '⚽', // Soccer Ball
  '🎮', // Video Game
  '🎲', // Game Die
  '♠️', // Spade Suit
  '👑', // Crown
  '💍', // Ring
  '🎤', // Microphone
  '🎧', // Headphone
  '🔋', // Battery
  '🔨', // Hammer
  '💉', // Syringe
  '🚽', // Toilet
  '🛒', // Shopping Cart
  '♻️', // Recycling Symbol
  '🅿️', // P Button
  '💡', // Light Bulb
  '📚', // Books
  '💰', // Money Bag
  '✉️', // Envelope
  '📱', // Mobile Phone
  '💻', // Laptop
  '📸', // Camera
  '📺', // Television
  '⚖️', // Balance Scale
  '💊', // Pill
  '🚬', // Cigarette
  '🗿', // Moai
  '🏁', // Chequered Flag
  '🏳️', // White Flag
  '🏳️‍🌈', // Rainbow Flag
  '🏳️‍⚧️', // Transgender Flag
  '🏴‍☠️', // Pirate Flag
  '⬆️', // Up Arrow
  '➡️', // Right Arrow
  '⬇️', // Down Arrow
  '⬅️', // Left Arrow
  '🔄', // Counterclockwise Arrows Button
  '▶️', // Play Button
  '⏸️', // Pause Button
  '⏹️', // Stop Button
  '⏺️', // Record Button
  '♀️', // Female Sign
  '♂️', // Male Sign
  '✖️', // Multiply
  '➕', // Plus
  '➖', // Minus
  '➗', // Divide
  '♾️', // Infinity
  '💲', // Heavy Dollar Sign
  '©️', // Copyright
  '®️', // Registered
  '™️', // Trade Mark
  '🔠', // Input Latin Uppercase
  '🔢', // Input Numbers
  '🔴', // Red Circle
  '🔵', // Blue Circle
  '🔶', // Large Orange Diamond
  '🔷', // Large Blue Diamond
  '🔺', // Red Triangle Pointed Up
  '🔻', // Red Triangle Pointed Down
  '💠', // Diamond with a Dot
  '🔳', // White Square Button
  // '🔲', // Black Square Button - Removed
  '😮', // Face with Open Mouth
  '😳', // Flushed Face
  '🥺', // Pleading Face
  '😢', // Crying Face
  '😭', // Loudly Crying Face
  '😱', // Face Screaming in Fear
  '😡', // Pouting Face
  '😠', // Angry Face
  '🤬', // Face with Symbols on Mouth
  '🦄', // Unicorn
  '🦓', // Zebra
  '🦌', // Deer
  '🦬', // Bison
  '🐂', // Ox
  '🐃', // Water Buffalo
  '🐽', // Pig Nose
  '🐏', // Ram
  '🦙', // Llama
  '🦒', // Giraffe
  '🦣', // Mammoth
  '🦏', // Rhinoceros
  '🦛', // Hippopotamus
  '🐭', // Mouse Face
  '🐀', // Rat
  '🐹', // Hamster
  '🐇', // Rabbit
  '🐿️', // Chipmunk
  '🦫', // Beaver
  '🦔', // Hedgehog
  '🦇', // Bat
  '🐻‍❄️', // Polar Bear
  '🐨', // Koala
  '🦥', // Sloth
  '🦦', // Otter
  '🦨', // Skunk
  '🦘', // Kangaroo
  '🦡', // Badger
  '🐾', // Paw Prints
  '🦃', // Turkey
  '🐔', // Chicken
  '🐓', // Rooster
  '🐣', // Hatching Chick
  '🐤', // Baby Chick
  '🐥', // Front-Facing Baby Chick
  '🕊️', // Dove
  '🦅', // Eagle
  '🦆', // Duck
  '🦢', // Swan
  '🦤', // Dodo
  '🪶', // Feather
  '🦩', // Flamingo
  '🦚', // Peacock
  '🦜', // Parrot
  '🦎', // Lizard
  '🐲', // Dragon Face
  '🐉', // Dragon
  '🦕', // Sauropod
  '🐳', // Spouting Whale
  '🐋', // Whale
  '🐬', // Dolphin
  '🦭', // Seal
  '🐡', // Blowfish
  '🦑', // Squid
  '🦪', // Oyster
  '🪲', // Beetle
  '🦗', // Cricket
  '🪳', // Cockroach
  '🕸️', // Spider Web
  '🦂', // Scorpion
  '🦟', // Mosquito
  '🪰', // Fly
  '🪱', // Worm
  '🌸', // Cherry Blossom
  '💮', // White Flower
  '🏵️', // Rosette
  '🥀', // Wilted Flower
  '🌺', // Hibiscus
  '🌼', // Daisy
  '🌷', // Tulip
  '🌱', // Seedling
  '🪴', // Potted Plant
  '🌲', // Evergreen Tree
  '🌴', // Palm Tree
  '🌾', // Sheaf of Rice
  '🌿', // Herb
  '☘️', // Shamrock
  '🍀', // Four Leaf Clover
  '🍂', // Fallen Leaf
  '🍃', // Leaf Fluttering in Wind
  '🍈', // Melon
  '🍉', // Watermelon
  '🍊', // Tangerine
  '🍋', // Lemon
  '🥭', // Mango
  '🍐', // Pear
  '🍑', // Peach
  '🍒', // Cherries
  '🫐', // Blueberries
  '🥝', // Kiwi Fruit
  '🍅', // Tomato
  '🫒', // Olive
  '🥥', // Coconut
  '🍆', // Eggplant
  '🥔', // Potato
  '🥕', // Carrot
  '🌽', // Ear of Corn
  '🫑', // Bell Pepper
  '🥒', // Cucumber
  '🥬', // Leafy Green
  '🥦', // Broccoli
  '🧄', // Garlic
  '🧅', // Onion
  '🥜', // Peanuts
  '🌰', // Chestnut
  '🥐', // Croissant
  '🥖', // Baguette Bread
  '🫓', // Flatbread
  '🥨', // Pretzel
  '🥯', // Bagel
  '🥞', // Pancakes
  '🧇', // Waffle
  '🍖', // Meat on Bone
  '🍗', // Poultry Leg
  '🥩', // Cut of Meat
  '🥓', // Bacon
  '🌭', // Hot Dog
  '🥪', // Sandwich
  '🌮', // Taco
  '🌯', // Burrito
  '🫔', // Tamale
  '🥙', // Stuffed Flatbread
  '🧆', // Falafel
  '🍳', // Cooking
  '🥘', // Shallow Pan of Food
  '🍲', // Pot of Food
  '🫕', // Fondue
  '🥣', // Bowl with Spoon
  '🥗', // Green Salad
  '🧈', // Butter
  '🧂', // Salt
  '🥫', // Canned Food
  '🍱', // Bento Box
  '🍘', // Rice Cracker
  '🍙', // Rice Ball
  '🍚', // Cooked Rice
  '🍛', // Curry Rice
  '🍜', // Steaming Bowl
  '🍝', // Spaghetti
  '🍠', // Roasted Sweet Potato
  '🍢', // Oden
  '🍣', // Sushi
  '🍤', // Fried Shrimp
  '🍥', // Fish Cake with Swirl
  '🥮', // Moon Cake
  '🍡', // Dango
  '🥟', // Dumpling
  '🥠', // Fortune Cookie
  '🥡', // Takeout Box
  '🦞', // Lobster
  '🍧', // Shaved Ice
  '🍨', // Ice Cream
  '🍩', // Doughnut
  '🍪', // Cookie
  '🍰', // Shortcake
  '🧁', // Cupcake
  '🥧', // Pie
  '🍮', // Custard
  '🍭', // Lollipop
  '🍼', // Baby Bottle
  '🥛', // Glass of Milk
  '🫖', // Teapot
  '🍵', // Teacup Without Handle
  '🍶', // Sake Bottle and Cup
  '🍾', // Bottle with Popping Cork
  '🍸', // Cocktail Glass
  '🍹', // Tropical Drink
  '🍻', // Clinking Beer Mugs
  '🥂', // Clinking Glasses
  '🥃', // Tumbler Glass
  '🥤', // Cup with Straw
  '🧋', // Bubble Tea
  '🧃', // Beverage Box
  '🧉', // Mate
  '🧊', // Ice
  '🍽️', // Fork and Knife with Plate
  '🍴', // Fork and Knife
  '🥄', // Spoon
  '🏺', // Amphora
  '🌎', // Earth Globe Americas
  '🌏', // Earth Globe Asia-Australia
  '🌐', // Globe with Meridians
  '🗾', // Map of Japan
  '🧭', // Compass
  '🏔️', // Snow-Capped Mountain
  '⛰️', // Mountain
  '🗻', // Mount Fuji
  '🏕️', // Camping
  '🏖️', // Beach with Umbrella
  '🏜️', // Desert
  '🏝️', // Desert Island
  '🏞️', // National Park
  '🏟️', // Stadium
  '🏛️', // Classical Building
  '🏗️', // Building Construction
  '🧱', // Brick
  '🪨', // Rock
  '🪵', // Wood
  '🛖', // Hut
  '🏘️', // Houses
  '🏚️', // Derelict House
  '🏡', // House with Garden
  '🏣', // Japanese Post Office
  '🏤', // Post Office
  '🏨', // Hotel
  '🏪', // Convenience Store
  '🏫', // School
  '🏬', // Department Store
  '🏭', // Factory
  '🏯', // Japanese Castle
  '💒', // Wedding
  '⛪', // Church
  '🕌', // Mosque
  '🛕', // Hindu Temple
  '🕍', // Synagogue
  '⛩️', // Shinto Shrine
  '🕋', // Kaaba
  '⛲', // Fountain
  '⛺', // Tent
  '🌁', // Foggy
  '🌃', // Night with Stars
  '🏙️', // Cityscape
  '🌄', // Sunrise Over Mountains
  '🌅', // Sunrise
  '🌆', // Cityscape at Dusk
  '🌇', // Sunset
  '🌉', // Bridge at Night
  '♨️', // Hot Springs
  '🎠', // Carousel Horse
  '🎡', // Ferris Wheel
  '🎢', // Roller Coaster
  '💈', // Barber Pole
  '🎪', // Circus Tent
  '🚃', // Railway Car
  '🚄', // High-Speed Train
  '🚅', // Bullet Train
  '🚆', // Train
  '🚇', // Metro
  '🚈', // Light Rail
  '🚉', // Station
  '🚊', // Tram
  '🚝', // Monorail
  '🚞', // Mountain Railway
  '🚋', // Tram Car
  '🚍', // Oncoming Bus
  '🚎', // Trolleybus
  '🚐', // Minibus
  '🚑', // Ambulance
  '🚒', // Fire Engine
  '🚔', // Oncoming Police Car
  '🚕', // Taxi
  '🚖', // Oncoming Taxi
  '🚘', // Oncoming Automobile
  '🚙', // Sport Utility Vehicle
  '🛻', // Pickup Truck
  '🚚', // Delivery Truck
  '🚛', // Articulated Lorry
  '🚜', // Tractor
  '🏎️', // Racing Car
  '🛵', // Motor Scooter
  '🛺', // Auto Rickshaw
  '🛴', // Kick Scooter
  '🛹', // Skateboard
  '🛼', // Roller Skate
  '🚏', // Bus Stop
  '🛣️', // Motorway
  '🛤️', // Railway Track
  '🛢️', // Oil Drum
  '⛽', // Fuel Pump
  '🚥', // Horizontal Traffic Light
  '🛶', // Canoe
  '🚤', // Speedboat
  '🛳️', // Passenger Ship
  '⛴️', // Ferry
  '🛥️', // Motor Boat
  '🛩️', // Small Airplane
  '🛫', // Airplane Departure
  '🛬', // Airplane Arrival
  '🪂', // Parachute
  '💺', // Seat
  '🚟', // Suspension Railway
  '🚠', // Mountain Cableway
  '🚡', // Aerial Tramway
  '🛰️', // Satellite
  '🛎️', // Bellhop Bell
  '🧳', // Luggage
  '⏳', // Hourglass Not Done
  '⌚', // Watch
  '⏱️', // Stopwatch
  '⏲️', // Timer Clock
  '🕰️', // Mantelpiece Clock
  '🕛', // Twelve O’Clock
  '🌑', // New Moon
  '🌒', // Waxing Crescent Moon
  '🌓', // First Quarter Moon
  '🌔', // Waxing Gibbous Moon
  '🌕', // Full Moon
  '🌖', // Waning Gibbous Moon
  '🌗', // Last Quarter Moon
  '🌘', // Waning Crescent Moon
  '🌚', // New Moon Face
  '🌛', // First Quarter Moon Face
  '🌜', // Last Quarter Moon Face
  '🌡️', // Thermometer
  '🌝', // Full Moon Face
  '🌞', // Sun with Face
  '🌟', // Glowing Star
  '🌠', // Shooting Star
  '🌌', // Milky Way
  '⛅', // Sun Behind Cloud
  '⛈️', // Cloud with Lightning and Rain
  '🌤️', // Sun Behind Small Cloud
  '🌧️', // Cloud with Rain
  '🌨️', // Cloud with Snow
  '🌩️', // Cloud with Lightning
  '🌪️', // Tornado
  '🌫️', // Fog
  '🌬️', // Wind Face
  '🌀', // Cyclone
  '🌂', // Closed Umbrella
  '☂️', // Umbrella
  '⛱️', // Umbrella on Ground
  '☃️', // Snowman
  '⛄', // Snowman Without Snow
  '☄️', // Comet
  '🧨', // Firecracker
  '✨', // Sparkles
  '🎈', // Balloon
  '🎊', // Confetti Ball
  '🎋', // Tanabata Tree
  '🎍', // Pine Decoration
  '🎎', // Japanese Dolls
  '🎏', // Carp Streamer
  '🎐', // Wind Chime
  '🎑', // Moon Viewing Ceremony
  '🧧', // Red Envelope
  '🎀', // Ribbon
  '🎁', // Wrapped Gift
  '🎗️', // Reminder Ribbon
  '🎟️', // Admission Tickets
  '🎫', // Ticket
  '🎖️', // Military Medal
  '🥇', // 1st Place Medal
  '🥈', // 2nd Place Medal
  '🥉', // 3rd Place Medal
  '⚾', // Baseball
  '🥎', // Softball
  '🏀', // Basketball
  '🏐', // Volleyball
  '🏈', // American Football
  '🏉', // Rugby Football
  '🎾', // Tennis
  '🥏', // Flying Disc
  '🎳', // Bowling
  '🏏', // Cricket Game
  '🏑', // Field Hockey
  '🏒', // Ice Hockey
  '🥍', // Lacrosse
  '🏓', // Ping Pong
  '🏸', // Badminton
  '🥊', // Boxing Glove
  '🥋', // Martial Arts Uniform
  '🥅', // Goal Net
  '⛳', // Flag in Hole
  '⛸️', // Ice Skate
  '🎣', // Fishing Rod
  '🤿', // Diving Mask
  '🎽', // Running Shirt
  '🎿', // Skis
  '🛷', // Sled
  '🥌', // Curling Stone
  '🎯', // Bullseye
  '🪀', // Yo-Yo
  '🪁', // Kite
  '🎱', // Pool 8 Ball
  '🔮', // Crystal Ball
  '🪄', // Magic Wand
  '🧿', // Nazar Amulet
  '🕹️', // Joystick
  '🎰', // Slot Machine
  '🧩', // Puzzle Piece
  '🧸', // Teddy Bear
  '🪅', // Piñata
  '🪆', // Nesting Dolls
  '♦️', // Diamond Suit
  '♣️', // Club Suit
  '♟️', // Chess Pawn
  '🃏', // Joker
  '🀄', // Mahjong Red Dragon
  '🎴', // Flower Playing Cards
  '🎭', // Performing Arts
  '🖼️', // Framed Picture
  '🎨', // Artist Palette
  '🧵', // Thread
  '🪡', // Sewing Needle
  '🧶', // Yarn
  '🪢', // Knot
  '👓', // Glasses
  '🕶️', // Sunglasses
  '🥽', // Goggles
  '🥼', // Lab Coat
  '🦺', // Safety Vest
  '👔', // Necktie
  '👕', // T-Shirt
  '👖', // Jeans
  '🧣', // Scarf
  '🧤', // Gloves
  '🧥', // Coat
  '🧦', // Socks
  '👗', // Dress
  '👘', // Kimono
  '🥻', // Sari
  '🩱', // One-Piece Swimsuit
  '🩲', // Briefs
  '🩳', // Shorts
  '👙', // Bikini
  '👚', // Woman’s Clothes
  '👛', // Purse
  '👜', // Handbag
  '👝', // Clutch Bag
  '🛍️', // Shopping Bags
  '🎒', // Backpack
  '🩴', // Thong Sandal
  '👞', // Man’s Shoe
  '👟', // Running Shoe
  '🥾', // Hiking Boot
  '🥿', // Flat Shoe
  '👠', // High-Heeled Shoe
  '👡', // Woman’s Sandal
  '🩰', // Ballet Shoes
  '👢', // Woman’s Boot
  '👒', // Woman’s Hat
  '🎩', // Top Hat
  '🎓', // Graduation Cap
  '🧢', // Billed Cap
  '🪖', // Military Helmet
  '⛑️', // Rescue Worker’s Helmet
  '📿', // Prayer Beads
  '💄', // Lipstick
  '💎', // Gem Stone
  '🔇', // Muted Speaker
  '🔈', // Speaker Low Volume
  '🔉', // Speaker Medium Volume
  '🔊', // Speaker High Volume
  '📢', // Loudspeaker
  '📣', // Megaphone
  '📯', // Postal Horn
  '🔔', // Bell
  '🔕', // Bell with Slash
  '🎼', // Musical Score
  '🎵', // Musical Note
  '🎶', // Musical Notes
  '🎙️', // Studio Microphone
  '🎚️', // Level Slider
  '🎛️', // Control Knobs
  '📻', // Radio
  '🎷', // Saxophone
  '🪗', // Accordion
  '🎸', // Guitar
  '🎹', // Musical Keyboard
  '🎺', // Trumpet
  '🎻', // Violin
  '🪕', // Banjo
  '🥁', // Drum
  '🪘', // Long Drum
  '📲', // Mobile Phone with Arrow
  '☎️', // Telephone
  '📞', // Telephone Receiver
  '📟', // Pager
  '📠', // Fax Machine
  '🔌', // Electric Plug
  '🖥️', // Desktop Computer
  '🖨️', // Printer
  '⌨️', // Keyboard
  '🖱️', // Computer Mouse
  '🖲️', // Trackball
  '💽', // Minidisc
  '💾', // Floppy Disk
  '💿', // Optical Disc
  '📀', // Dvd
  '🧮', // Abacus
  '🎥', // Movie Camera
  '🎞️', // Film Frames
  '📽️', // Film Projector
  '🎬', // Clapper Board
  '📷', // Camera
  '🔎', // Magnifying Glass Tilted Right
  '🕯️', // Candle
  '🔦', // Flashlight
  '🏮', // Red Paper Lantern
  '🪔', // Diya Lamp
  '📔', // Notebook with Decorative Cover
  '📕', // Closed Book
  '📖', // Open Book
  '📗', // Green Book
  '📘', // Blue Book
  '📙', // Orange Book
  '📓', // Notebook
  '📒', // Ledger
  '📃', // Page with Curl
  '📜', // Scroll
  '📄', // Page Facing Up
  '📰', // Newspaper
  '🗞️', // Rolled-Up Newspaper
  '📑', // Bookmark Tabs
  '🔖', // Bookmark
  '🏷️', // Label
  '🪙', // Coin
  '💴', // Yen Banknote
  '💵', // Dollar Banknote
  '💶', // Euro Banknote
  '💷', // Pound Banknote
  '💸', // Money with Wings
  '💳', // Credit Card
  '🧾', // Receipt
  '💹', // Chart Increasing with Yen
  '📧', // E-Mail
  '📨', // Incoming Envelope
  '📩', // Envelope with Arrow
  '📤', // Outbox Tray
  '📥', // Inbox Tray
  '📦', // Package
  '📫', // Closed Mailbox with Raised Flag
  '📬', // Open Mailbox with Raised Flag
  '📭', // Open Mailbox with Lowered Flag
  '📮', // Postbox
  '🗳️', // Ballot Box with Ballot
  '✏️', // Pencil
  '✒️', // Black Nib
  '🖋️', // Fountain Pen
  '🖊️', // Pen
  '🖌️', // Paintbrush
  '🖍️', // Crayon
  '📝', // Memo
  '💼', // Briefcase
  '📁', // File Folder
  '📅', // Calendar
  '🗒️', // Spiral Notepad
  '📇', // Card Index
  '📈', // Chart Increasing
  '📉', // Chart Decreasing
  '📊', // Bar Chart
  '📋', // Clipboard
  '📌', // Pushpin
  '📍', // Round Pushpin
  '📎', // Paperclip
  '🖇️', // Linked Paperclips
  '📏', // Straight Ruler
  '📐', // Triangular Ruler
  '✂️', // Scissors
  '🗃️', // Card File Box
  '🗄️', // File Cabinet
  '🗑️', // Wastebasket
  '🔏', // Locked with Pen
  '🔐', // Locked with Key
  '🗝️', // Old Key
  '🪓', // Axe
  '⛏️', // Pick
  '⚒️', // Hammer and Pick
  '🛠️', // Hammer and Wrench
  '🗡️', // Dagger
  '⚔️', // Crossed Swords
  '🔫', // Pistol
  '🪃', // Boomerang
  '🏹', // Bow and Arrow
  '🪚', // Saw
  '🔧', // Wrench
  '🪛', // Screwdriver
  '🔩', // Nut and Bolt
  '⚙️', // Gear
  '🗜️', // Clamp
  '🦯', // White Cane
  '⛓️', // Chains
  '🪝', // Hook
  '🧰', // Toolbox
  '🧲', // Magnet
  '🪜', // Ladder
  '⚗️', // Alembic
  '🧪', // Test Tube
  '🧫', // Petri Dish
  '🧬', // Dna
  '🔬', // Microscope
  '🔭', // Telescope
  '📡', // Satellite Antenna
  '🩸', // Drop of Blood
  '🩹', // Adhesive Bandage
  '🩺', // Stethoscope
  '🚪', // Door
  '🛗', // Elevator
  '🪞', // Mirror
  '🪟', // Window
  '🛏️', // Bed
  '🛋️', // Couch and Lamp
  '🪑', // Chair
  '🪠', // Plunger
  '🚿', // Shower
  '🛁', // Bathtub
  '🪤', // Mouse Trap
  '🪒', // Razor
  '🧴', // Lotion Bottle
  '🧷', // Safety Pin
  '🧹', // Broom
  '🧺', // Basket
  '🧻', // Roll of Paper
  '🪣', // Bucket
  '🧼', // Soap
  '🪥', // Toothbrush
  '🧽', // Sponge
  '🧯', // Fire Extinguisher
  '🏧', // Atm Sign
  '🚮', // Litter in Bin Sign
  '🚰', // Potable Water
  '♿', // Wheelchair Symbol
  '🚹', // Men’s Room
  '🚺', // Women’s Room
  '🚻', // Restroom
  '🚼', // Baby Symbol
  '🚾', // Water Closet
  '🛂', // Passport Control
  '🛃', // Customs
  '🛄', // Baggage Claim
  '🛅', // Left Luggage
  '🚸', // Children Crossing
  '🚳', // No Bicycles
  '🚭', // No Smoking
  '🚯', // No Littering
  '🚱', // Non-Potable Water
  '🚷', // No Pedestrians
  '📵', // No Mobile Phones
  '🔞', // No One Under Eighteen
  '☢️', // Radioactive
  '☣️', // Biohazard
  '↗️', // Up-Right Arrow
  '↘️', // Down-Right Arrow
  '↙️', // Down-Left Arrow
  '↖️', // Up-Left Arrow
  '↕️', // Up-Down Arrow
  '↔️', // Left-Right Arrow
  '↩️', // Right Arrow Curving Left
  '↪️', // Left Arrow Curving Right
  '⤴️', // Right Arrow Curving Up
  '⤵️', // Right Arrow Curving Down
  '🔃', // Clockwise Vertical Arrows
  '🔙', // Back Arrow
  '🔚', // End Arrow
  '🔛', // On! Arrow
  '🔜', // Soon Arrow
  '🔝', // Top Arrow
  '🛐', // Place of Worship
  '⚛️', // Atom Symbol
  '🕉️', // Om Symbol
  '✡️', // Star of David
  '☸️', // Wheel of Dharma
  '☯️', // Yin Yang
  '✝️', // Latin Cross
  '☦️', // Orthodox Cross
  '☪️', // Star and Crescent
  '☮️', // Peace Symbol
  '🕎', // Menorah
  '🔯', // Dotted Six-Pointed Star
  '♈', // Aries
  '♉', // Taurus
  '♊', // Gemini
  '♋', // Cancer
  '♌', // Leo
  '♍', // Virgo
  '♎', // Libra
  '♏', // Scorpio
  '♐', // Sagittarius
  '♑', // Capricorn
  '♒', // Aquarius
  '♓', // Pisces
  '⛎', // Ophiuchus
  '🔀', // Shuffle Tracks Button
  '🔁', // Repeat Button
  '🔂', // Repeat Single Button
  '⏩', // Fast-Forward Button
  '⏭️', // Next Track Button
  '⏯️', // Play or Pause Button
  '◀️', // Reverse Button
  '⏪', // Fast-Reverse Button
  '⏮️', // Last Track Button
  '⏫', // Fast Up Button
  '⏬', // Fast Down Button
  '⏏️', // Eject Button
  '🎦', // Cinema
  '🔅', // Dim Button
  '🔆', // Bright Button
  '📶', // Antenna Bars
  '📳', // Vibration Mode
  '📴', // Mobile Phone Off
  '⚧️', // Transgender Symbol
  '〰️', // Squiggly Dash
  '💱', // Currency Exchange
  '⚕️', // Medical Symbol
  '⚜️', // Fleur-De-Lis
  '🔱', // Trident Emblem
  '📛', // Name Badge
  '🔰', // Japanese Symbol for Beginner
  '⭕', // Heavy Large Circle
  '➰', // Curly Loop
  '➿', // Double Curly Loop
  '〽️', // Part Alternation Mark
  '✳️', // Eight-Spoked Asterisk
  '✴️', // Eight-Pointed Star
  '❇️', // Sparkle
  '🟠', // Orange Circle
  '🟡', // Yellow Circle
  '🟢', // Green Circle
  '🟣', // Purple Circle
  '🟤', // Brown Circle
  '⚫', // Black Circle
  '⚪', // White Circle
  '🟥', // Red Square
  '🟧', // Orange Square
  '🟨', // Yellow Square
  '🟩', // Green Square
  '🟦', // Blue Square
  '🟪', // Purple Square
  '🟫', // Brown Square
  '⬛', // Black Large Square
  '⬜', // White Large Square
  // '◼️', // Black Medium Square - Removed
  // '◻️', // White Medium Square - Removed
  // '▪️', // Black Small Square - Removed
  // '▫️', // White Small Square - Removed
  // '🔸', // Small Orange Diamond - Removed
  // '🔹', // Small Blue Diamond - Removed
  '🔘' // Radio Button
];

const source = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9'
];
