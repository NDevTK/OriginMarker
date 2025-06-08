'use strict';
const unknown = 'Marker';

const emoji = [
  // Faces & Fantasy (Distinct)
  '🤯', // Exploding Head
  '🥸', // Disguised Face
  '💀', // Skull
  '👻', // Ghost
  '👽', // Alien
  '🤖', // Robot Face
  '👹', // Ogre
  '🤡', // Clown Face
  '😈', // Smiling Face with Horns
  '🎃', // Jack-O-Lantern

  // Body & Symbols (Distinct)
  '❤️', // Red Heart
  '💔', // Broken Heart
  '🧠', // Brain
  '👀', // Eyes
  '🦷', // Tooth
  '👑', // Crown
  '💎', // Gem Stone
  '💯', // Hundred Points
  '💣', // Bomb

  // Animals & Nature (Visually Diverse)
  '🙈', // See-No-Evil Monkey
  '🦋', // Butterfly
  '🐌', // Snail
  '🐍', // Snake
  '🐢', // Turtle
  '🐙', // Octopus
  '🦀', // Crab
  '🦈', // Shark
  '🐠', // Tropical Fish
  '🐳', // Spouting Whale
  '🦖', // T-Rex
  '🐉', // Dragon
  '🦂', // Scorpion
  '🕷️', // Spider
  '🌳', // Deciduous Tree
  '🌵', // Cactus
  '🍄', // Mushroom
  '🌹', // Rose
  '🌻', // Sunflower
  '🌸', // Cherry Blossom
  '🍁', // Maple Leaf
  '🍀', // Shamrock
  '🌱', // Seedling

  // Food & Drink (Iconic Shapes)
  '🍕', // Pizza
  '🍔', // Hamburger
  '🍟', // French Fries
  '🍩', // Doughnut
  '🎂', // Birthday Cake
  '🍫', // Chocolate Bar
  '🍿', // Popcorn
  '🍭', // Lollipop
  '🍎', // Red Apple
  '🍓', // Strawberry
  '🥑', // Avocado
  '🌶️', // Hot Pepper
  '☕', // Hot Beverage
  '🍺', // Beer Mug

  // Places & Transport (Distinct Shapes)
  '🏠', // House
  '🏰', // Castle
  '⛺', // Tent
  '🌋', // Volcano
  '🚀', // Rocket
  '🛸', // Flying Saucer
  '🚁', // Helicopter
  '⛵', // Sailboat
  '⚓', // Anchor

  // Objects (Unique & Recognizable)
  '🔑', // Key
  '🔔', // Bell
  '💡', // Light Bulb
  '🎁', // Wrapped Gift
  '🎈', // Balloon
  '☂️', // Umbrella
  '🎨', // Artist Palette
  '🎯', // Bullseye
  '🎲', // Game Die
  '🧩', // Puzzle Piece
  '♟️', // Chess Pawn
  '🎸', // Guitar
  '🎻', // Violin
  '🔭', // Telescope
  '🔬', // Microscope
  '🧬', // DNA
  '⚙️', // Gear
  '🔨', // Hammer
  '⚔️', // Crossed Swords
  '🛡️', // Shield
  '💰', // Money Bag
  '🧭', // Compass
  '🗿', // Moai

  // Abstract & Geometric Symbols
  '⭐', // Star
  '🔥', // Fire
  '⚡', // High Voltage
  '❄️', // Snowflake
  '☀️', // Sun
  '🌙', // Crescent Moon
  '🌊', // Water Wave
  '☄️', // Comet
  '🪐', // Ringed Planet
  '☮️', // Peace Symbol
  '☯️', // Yin Yang
  '☢️', // Radioactive
  '☣️', // Biohazard
  '♻️', // Recycling Symbol
  '♾️', // Infinity
  '♠️', // Spade Suit
  '♣️', // Club Suit
  '♥️', // Heart Suit
  '♦️', // Diamond Suit
  '🚩', // Triangular Flag
  '🏁', // Chequered Flag
  '🏴‍☠️', // Pirate Flag

  // Simple Shapes & Arrows
  '🔴', // Red Circle
  '🟠', // Orange Circle
  '🟡', // Yellow Circle
  '🟢', // Green Circle
  '🔵', // Blue Circle
  '🟣', // Purple Circle
  '⚫', // Black Circle
  '⚪', // White Circle
  '🟤', // Brown Circle
  '🔺', // Red Triangle Pointed Up
  '🔻', // Red Triangle Pointed Down
  '🔶', // Large Orange Diamond
  '🔷', // Large Blue Diamond
  '✅', // Check Mark Button
  '✔️', // Check Mark
  '❌', // Cross Mark
  '❓', // Question Mark
  '❗', // Exclamation Mark
  '⬆️', // Up Arrow
  '⬇️', // Down Arrow
  '⬅️', // Left Arrow
  '➡️', // Right Arrow
  '🔄', // Counterclockwise Arrows Button
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
  'f',
];
