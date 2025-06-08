'use strict';
const unknown = 'Marker';

const emoji = [
  '😀', // Grinning Face
  '😴', // Sleeping Face
  '😷', // Face with Medical Mask
  '🤯', // Exploding Head
  '🥶', // Cold Face
  '🥵', // Hot Face
  '🤮', // Face Vomiting
  '🤑', // Money-Mouth Face
  '🤪', // Zany Face
  '😍', // Smiling Face with Heart-Eyes
  '💀', // Skull
  '👹', // Ogre
  '👻', // Ghost
  '👽', // Alien
  '🤖', // Robot Face
  '❤️', // Red Heart
  '💯', // Hundred Points Symbol
  '💣', // Bomb
  '💬', // Speech Balloon
  '👋', // Waving Hand
  '👍', // Thumbs Up
  '🧠', // Brain
  '👀', // Eyes
  '👂', // Ear
  '👃', // Nose
  '👅', // Tongue
  '👄', // Mouth
  '🦷', // Tooth
  '🎅', // Santa Claus
  '🦸', // Superhero
  '🧟', // Zombie
  '🚶', // Person Walking
  '👤', // Bust in Silhouette
  '🐒', // Monkey
  '🐶', // Dog Face
  '🐅', // Tiger
  '🐘', // Elephant
  '🐍', // Snake
  '🐠', // Tropical Fish
  '🐡', // Blowfish
  '🦈', // Shark
  '🦋', // Butterfly
  '🐌', // Snail
  '🦖', // T-Rex
  '🐧', // Penguin
  '🦉', // Owl
  '🐢', // Turtle
  '🐙', // Octopus
  '🦀', // Crab
  '🐎', // Horse
  '🐄', // Cow
  '🐑', // Ewe
  '🐺', // Wolf
  '🐻', // Bear
  '🐨', // Koala
  '🐸', // Frog
  '🐊', // Crocodile
  '🦌', // Deer
  '🦒', // Giraffe
  '🦛', // Hippopotamus
  '🐭', // Mouse Face
  '🦔', // Hedgehog
  '🦇', // Bat
  '🦥', // Sloth
  '🦦', // Otter
  '🦨', // Skunk
  '🦘', // Kangaroo
  '🐾', // Paw Prints
  '🐔', // Chicken
  '🦅', // Eagle
  '🦢', // Swan
  '🦩', // Flamingo
  '🦚', // Peacock
  '🦜', // Parrot
  '🪶', // Feather
  '🐉', // Dragon
  '🐳', // Spouting Whale
  '🐬', // Dolphin
  '🦭', // Seal
  '🦪', // Oyster
  '🌹', // Rose
  '🌻', // Sunflower
  '🌳', // Deciduous Tree
  '🌵', // Cactus
  '🌸', // Cherry Blossom
  '🌱', // Seedling
  '🍎', // Red Apple
  '🍌', // Banana
  '🍍', // Pineapple
  '🍓', // Strawberry
  '🥑', // Avocado
  '🌶️', // Hot Pepper
  '🍄', // Mushroom
  '🥨', // Pretzel
  '🧀', // Cheese Wedge
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
  '🥛', // Glass of Milk
  '🍾', // Bottle with Popping Cork
  '🥤', // Cup with Straw
  '🧊', // Ice
  '🥢', // Chopsticks
  '🔪', // Kitchen Knife
  '🍴', // Fork and Knife
  '🍖', // Meat on Bone
  '🥓', // Bacon
  '🌭', // Hot Dog
  '🥪', // Sandwich
  '🌮', // Taco
  '🥗', // Green Salad
  '🍚', // Cooked Rice
  '🍙', // Rice Ball
  '🍜', // Steaming Bowl
  '🍣', // Sushi
  '🏠', // House
  '🏢', // Office Building
  '🏥', // Hospital
  '🏦', // Bank
  '🏰', // Castle
  '🏨', // Hotel
  '🏪', // Convenience Store
  '🏫', // School
  '🏭', // Factory
  '⛪', // Church
  '⛺', // Tent
  '🌉', // Bridge at Night
  '🌋', // Volcano
  '🚂', // Locomotive
  '🚌', // Bus
  '🚗', // Automobile
  '🏍️', // Motorcycle
  '🚲', // Bicycle
  '⛵', // Sailboat
  '🚁', // Helicopter
  '🚀', // Rocket
  '🛸', // Flying Saucer
  '🪐', // Ringed Planet
  '☄️', // Comet
  '🕛', // Twelve O’Clock
  '⭐', // Star
  '☁️', // Cloud
  '⚡', // High Voltage
  '🔥', // Fire
  '🌊', // Water Wave
  '🎄', // Christmas Tree
  '🎉', // Party Popper
  '🎁', // Wrapped Gift
  '🎈', // Balloon
  '🏆', // Trophy
  '⚽', // Soccer Ball
  '🏀', // Basketball
  '🎳', // Bowling
  '🥊', // Boxing Glove
  '⛳', // Flag in Hole
  '🎣', // Fishing Rod
  '🎿', // Skis
  '🎮', // Video Game
  '🎲', // Game Die
  '🧩', // Puzzle Piece
  '🧸', // Teddy Bear
  '♟️', // Chess Pawn
  '🎯', // Bullseye
  '🪀', // Yo-Yo
  '🪁', // Kite
  '🎱', // Pool 8 Ball
  '🔮', // Crystal Ball
  '🪡', // Sewing Needle
  '🪢', // Knot
  '👕', // T-Shirt
  '👖', // Jeans
  '👟', // Running Shoe
  '👠', // High-Heeled Shoe
  '👒', // Woman’s Hat
  '🎩', // Top Hat
  '👑', // Crown
  '🎓', // Graduation Cap
  '👓', // Glasses
  '👔', // Necktie
  '💡', // Light Bulb
  '📚', // Books
  '💰', // Money Bag
  '✉️', // Envelope
  '✏️', // Pencil
  '📰', // Newspaper
  '💼', // Briefcase
  '📅', // Calendar
  '📈', // Chart Increasing
  '📌', // Pushpin
  '📎', // Paperclip
  '✂️', // Scissors
  '🗑️', // Wastebasket
  '🔨', // Hammer
  '🔫', // Pistol
  '🏹', // Bow and Arrow
  '🔧', // Wrench
  '🔩', // Nut and Bolt
  '⚙️', // Gear
  '🧰', // Toolbox
  '🧲', // Magnet
  '🪜', // Ladder
  '⚗️', // Alembic
  '🧪', // Test Tube
  '🧫', // Petri Dish
  '🧬', // Dna
  '🔬', // Microscope
  '🔭', // Telescope
  '💉', // Syringe
  '🩸', // Drop of Blood
  '🩹', // Adhesive Bandage
  '🩺', // Stethoscope
  '💊', // Pill
  '🚬', // Cigarette
  '⚰️', // Coffin
  '🗿', // Moai
  '🚽', // Toilet
  '🚿', // Shower
  '🚪', // Door
  '🪑', // Chair
  '🛏️', // Bed
  '🛒', // Shopping Cart
  '💎', // Gem Stone
  '🔔', // Bell
  '☂️', // Umbrella
  '⛓️', // Chains
  '🧭', // Compass
  '🧯', // Fire Extinguisher
  '♻️', // Recycling Symbol
  '🅿️', // P Button
  '♿', // Wheelchair Symbol
  '🚸', // Children Crossing
  '🚭', // No Smoking
  '🔞', // No One Under Eighteen
  '🎦', // Cinema
  '📶', // Antenna Bars
  '❓', // Question Mark
  '📛', // Name Badge
  '🏁', // Chequered Flag
  '🏳️', // White Flag
  '🏳️‍🌈', // Rainbow Flag
  '🏴‍☠️', // Pirate Flag
  '⬆️', // Up Arrow
  '🔄', // Counterclockwise Arrows Button
  '▶️', // Play Button
  '©️', // Copyright
  '🔴', // Red Circle
  '🥸', // Disguised Face
  '🫠', // Melting Face
  '🫡', // Saluting Face
  '🥷', // Ninja
  '🫘', // Beans
  '🛞', // Wheel
  '🪩', // Mirror Ball
  '🪫', // Low Battery
  '🫧', // Bubbles
  '🪸', // Coral
  '☀️', // Sun
  '✔️', // Check Mark
  '❌', // Cross Mark
  '❗', // Exclamation Mark
  '❄️', // Snowflake
  '⚓', // Anchor
  '⏳', // Hourglass Done
  '🔒', // Locked
  '🔑', // Key
  '⚫', // Black Circle
  '🌪️', // Tornado
  '⛰️', // Mountain
  '🌕', // Full Moon
  '🍁', // Maple Leaf
  '🪓', // Axe
  '🍞', // Bread
  '☯️', // Yin Yang
  '☮️', // Peace Symbol
  '☣️', // Biohazard
  '☢️' // Radiation
];

const source = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f'
];
