// ============================================
// BUILT-IN GAME CONTENT DEFAULTS
// ============================================
// Used when the game_content table has no override for a game. Keeping these
// here (rather than inline in each page) lets both the game pages and the admin
// editor share the same baseline data.
import type { MCContent, TFContent } from '@/types/games';

export const DEFAULT_MULTIPLE_CHOICE: MCContent = {
  beginner: [
    { id: 1, question: 'What color is the sky?', options: ['Blue', 'Red', 'Green', 'Yellow'], answer: 'Blue', explanation: 'The sky appears blue due to the scattering of sunlight.' },
    { id: 2, question: 'Which animal barks?', options: ['Cat', 'Dog', 'Fish', 'Bird'], answer: 'Dog', explanation: 'Dogs bark. Cats meow.' },
    { id: 3, question: 'What do you drink in the morning?', options: ['Tea', 'Juice', 'Soda', 'Wine'], answer: 'Tea', explanation: 'Tea is a common morning drink.' },
    { id: 4, question: 'Which is a fruit?', options: ['Apple', 'Car', 'Chair', 'Book'], answer: 'Apple', explanation: 'Apple is a fruit.' },
    { id: 5, question: 'What do you use to write?', options: ['Pen', 'Spoon', 'Shoe', 'Hat'], answer: 'Pen', explanation: 'A pen is used for writing.' },
    { id: 6, question: 'Which is a day of the week?', options: ['Monday', 'January', 'Summer', 'Dog'], answer: 'Monday', explanation: 'Monday is a day of the week.' },
    { id: 7, question: 'What do you wear on your feet?', options: ['Socks', 'Gloves', 'Hat', 'Shirt'], answer: 'Socks', explanation: 'Socks are worn on your feet.' },
    { id: 8, question: 'Which is a vegetable?', options: ['Carrot', 'Apple', 'Cake', 'Milk'], answer: 'Carrot', explanation: 'Carrot is a vegetable.' },
    { id: 9, question: 'What do you read?', options: ['Book', 'Shoe', 'Egg', 'Tree'], answer: 'Book', explanation: 'You read a book.' },
    { id: 10, question: 'Which is a season?', options: ['Winter', 'Monday', 'Dog', 'Pen'], answer: 'Winter', explanation: 'Winter is a season.' },
    { id: 11, question: 'What do you eat for breakfast?', options: ['Eggs', 'Shoes', 'Books', 'Cars'], answer: 'Eggs', explanation: 'Eggs are a common breakfast food.' },
    { id: 12, question: 'Which animal can fly?', options: ['Bird', 'Dog', 'Cat', 'Fish'], answer: 'Bird', explanation: 'Birds can fly with their wings.' },
    { id: 13, question: 'What do you use to cut paper?', options: ['Scissors', 'Pen', 'Book', 'Spoon'], answer: 'Scissors', explanation: 'Scissors are used to cut paper.' },
    { id: 14, question: 'Which is a drink?', options: ['Juice', 'Chair', 'Hat', 'Shoe'], answer: 'Juice', explanation: 'Juice is a drink.' },
    { id: 15, question: 'What do you wear on your head?', options: ['Hat', 'Socks', 'Book', 'Car'], answer: 'Hat', explanation: 'A hat is worn on your head.' },
  ],
  intermediate: [
    { id: 31, question: 'Which animal can swim?', options: ['Fish', 'Cat', 'Dog', 'Bird'], answer: 'Fish', explanation: 'Fish swim in water.' },
    { id: 32, question: 'What do you use to open a door?', options: ['Key', 'Book', 'Pen', 'Spoon'], answer: 'Key', explanation: 'A key is used to open a door.' },
    { id: 33, question: 'Which is a month?', options: ['January', 'Monday', 'Summer', 'Dog'], answer: 'January', explanation: 'January is a month.' },
    { id: 34, question: 'What do you wear on your hands?', options: ['Gloves', 'Socks', 'Hat', 'Shirt'], answer: 'Gloves', explanation: 'Gloves are worn on hands.' },
    { id: 35, question: 'What do you use to see?', options: ['Eyes', 'Ears', 'Nose', 'Mouth'], answer: 'Eyes', explanation: 'Eyes are used for seeing.' },
    { id: 36, question: 'What do you use to listen to music?', options: ['Ears', 'Eyes', 'Nose', 'Mouth'], answer: 'Ears', explanation: 'Ears are used for hearing.' },
    { id: 37, question: 'What do you use to eat with?', options: ['Fork', 'Pen', 'Book', 'Shoe'], answer: 'Fork', explanation: 'A fork is used for eating.' },
    { id: 38, question: 'What do you use to write on?', options: ['Paper', 'Spoon', 'Shoe', 'Hat'], answer: 'Paper', explanation: 'Paper is used for writing.' },
    { id: 39, question: 'What do you use to cut food?', options: ['Knife', 'Pen', 'Book', 'Spoon'], answer: 'Knife', explanation: 'A knife is used to cut food.' },
    { id: 40, question: 'What do you use to tell time?', options: ['Watch', 'Shoe', 'Hat', 'Glove'], answer: 'Watch', explanation: 'A watch is used to tell time.' },
  ],
  advanced: [
    { id: 56, question: 'Which animal has a long neck?', options: ['Giraffe', 'Dog', 'Cat', 'Fish'], answer: 'Giraffe', explanation: 'A giraffe is known for its very long neck.' },
    { id: 57, question: 'What do you use to brush your teeth?', options: ['Toothbrush', 'Spoon', 'Pen', 'Book'], answer: 'Toothbrush', explanation: 'A toothbrush is used for dental hygiene.' },
    { id: 58, question: 'Which is a type of transport?', options: ['Train', 'Dog', 'Book', 'Tree'], answer: 'Train', explanation: 'A train is a type of transport.' },
    { id: 61, question: 'Which profession treats patients in hospitals?', options: ['Doctor', 'Teacher', 'Engineer', 'Artist'], answer: 'Doctor', explanation: 'Doctors treat patients in hospitals.' },
    { id: 64, question: 'What profession designs buildings?', options: ['Architect', 'Painter', 'Writer', 'Singer'], answer: 'Architect', explanation: 'An architect designs buildings.' },
    { id: 65, question: 'What profession creates software programs?', options: ['Programmer', 'Mechanic', 'Electrician', 'Plumber'], answer: 'Programmer', explanation: 'A programmer creates software programs.' },
    { id: 66, question: 'Which is a continent?', options: ['Europe', 'Paris', 'London', 'Tokyo'], answer: 'Europe', explanation: 'Europe is a continent.' },
    { id: 67, question: 'Which is a planet?', options: ['Mars', 'Sun', 'Moon', 'Star'], answer: 'Mars', explanation: 'Mars is a planet.' },
    { id: 70, question: 'Which is a metal?', options: ['Gold', 'Wood', 'Plastic', 'Glass'], answer: 'Gold', explanation: 'Gold is a metal.' },
    { id: 72, question: 'Which is a type of bird?', options: ['Eagle', 'Dog', 'Cat', 'Fish'], answer: 'Eagle', explanation: 'An eagle is a type of bird.' },
  ],
};

export const DEFAULT_TRUE_FALSE: TFContent = {
  beginner: [
    { id: 1, text: 'The sky is blue.', answer: true, explanation: 'The sky appears blue due to the scattering of sunlight.' },
    { id: 2, text: 'Cats can fly.', answer: false, explanation: "Cats cannot fly — they don't have wings." },
    { id: 3, text: 'Fish live in water.', answer: true, explanation: 'Fish are aquatic animals that live in water.' },
    { id: 4, text: 'The sun is cold.', answer: false, explanation: 'The sun is extremely hot, not cold.' },
    { id: 5, text: 'Birds have wings.', answer: true, explanation: 'Birds have wings to help them fly.' },
    { id: 6, text: 'Dogs say meow.', answer: false, explanation: 'Dogs bark. Cats say meow.' },
    { id: 7, text: 'Milk is white.', answer: true, explanation: 'Milk is usually white in color.' },
    { id: 8, text: 'Books are for eating.', answer: false, explanation: 'Books are for reading, not eating.' },
    { id: 9, text: 'Bananas are yellow.', answer: true, explanation: 'Ripe bananas are yellow.' },
    { id: 10, text: 'Cars swim in the sea.', answer: false, explanation: 'Cars cannot swim; they drive on roads.' },
    { id: 11, text: 'The moon shines at night.', answer: true, explanation: 'The moon is visible and shines at night.' },
    { id: 12, text: 'Apples are a fruit.', answer: true, explanation: 'Apples are indeed a type of fruit.' },
    { id: 13, text: 'Water is wet.', answer: true, explanation: 'Water is considered wet as it is a liquid.' },
    { id: 14, text: 'Fire is cold.', answer: false, explanation: 'Fire is hot, not cold.' },
    { id: 15, text: 'The earth is round.', answer: true, explanation: 'The Earth is round (spherical) in shape.' },
  ],
  intermediate: [
    { id: 31, text: 'Cats can swim.', answer: true, explanation: "Cats can swim, though they usually don't like water." },
    { id: 32, text: 'The moon is made of cheese.', answer: false, explanation: 'The moon is made of rock and dust, not cheese.' },
    { id: 34, text: 'The sun is a star.', answer: true, explanation: 'The sun is indeed a star — the closest one to Earth.' },
    { id: 35, text: 'Water boils at 100 degrees Celsius.', answer: true, explanation: 'Water boils at 100°C at sea level.' },
    { id: 41, text: 'Lemons are sweet.', answer: false, explanation: 'Lemons are sour, not sweet.' },
    { id: 44, text: 'The Earth revolves around the Sun.', answer: true, explanation: 'The Earth revolves around the Sun.' },
    { id: 46, text: 'Plants produce oxygen.', answer: true, explanation: 'Plants produce oxygen through photosynthesis.' },
    { id: 47, text: 'Diamonds are soft.', answer: false, explanation: 'Diamonds are very hard.' },
    { id: 50, text: 'Wood comes from animals.', answer: false, explanation: 'Wood comes from plants (trees), not animals.' },
    { id: 55, text: 'A whale is a fish.', answer: false, explanation: 'A whale is a mammal, not a fish.' },
  ],
  advanced: [
    { id: 56, text: 'Sound travels faster than light.', answer: false, explanation: 'Light travels much faster than sound.' },
    { id: 58, text: 'Penguins can fly.', answer: false, explanation: 'Penguins are flightless birds that swim instead.' },
    { id: 60, text: 'Humans have 206 bones.', answer: true, explanation: 'Adult humans have 206 bones.' },
    { id: 63, text: 'Octopuses have three hearts.', answer: true, explanation: 'Octopuses have three hearts.' },
    { id: 64, text: 'Venus is the closest planet to the Sun.', answer: false, explanation: 'Mercury is closest to the Sun, not Venus.' },
    { id: 65, text: 'A tomato is a fruit.', answer: true, explanation: 'Botanically, a tomato is a fruit (a berry).' },
    { id: 67, text: 'Sharks are mammals.', answer: false, explanation: 'Sharks are fish, not mammals.' },
    { id: 69, text: 'Dolphins are fish.', answer: false, explanation: 'Dolphins are mammals, not fish.' },
    { id: 74, text: 'Antarctica is a continent.', answer: true, explanation: 'Antarctica is a continent.' },
    { id: 75, text: 'Spiders are insects.', answer: false, explanation: 'Spiders are arachnids, not insects.' },
  ],
};
