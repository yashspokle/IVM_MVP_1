// Fruit information database
export interface FruitInfo {
  name: string;
  description: string;
  calories: string;
  vitamins: string[];
  benefits: string[];
  funFact: string;
}

const fruitDatabase: Record<string, FruitInfo> = {
  apple: {
    name: "Apple",
    description: "A crisp and sweet fruit from the rose family.",
    calories: "52 calories per 100g",
    vitamins: ["Vitamin C", "Vitamin K", "Potassium"],
    benefits: ["Supports heart health", "Aids digestion", "Boosts immunity"],
    funFact: "Apples float because they are 25% air!",
  },
  banana: {
    name: "Banana",
    description: "A tropical fruit known for its high potassium content.",
    calories: "89 calories per 100g",
    vitamins: ["Vitamin B6", "Vitamin C", "Potassium", "Magnesium"],
    benefits: ["Provides instant energy", "Supports muscle function", "Good for digestion"],
    funFact: "Bananas are technically berries, but strawberries aren't!",
  },
  orange: {
    name: "Orange",
    description: "A citrus fruit famous for its vitamin C content.",
    calories: "47 calories per 100g",
    vitamins: ["Vitamin C", "Thiamin", "Folate"],
    benefits: ["Boosts immune system", "Improves skin health", "Aids iron absorption"],
    funFact: "The word 'orange' comes from Sanskrit 'nāranga'.",
  },
  strawberry: {
    name: "Strawberry",
    description: "A sweet, red berry loved worldwide.",
    calories: "32 calories per 100g",
    vitamins: ["Vitamin C", "Manganese", "Folate"],
    benefits: ["High in antioxidants", "Supports heart health", "Good for skin"],
    funFact: "Strawberries are the only fruit with seeds on the outside!",
  },
  grape: {
    name: "Grape",
    description: "Small, sweet fruits that grow in clusters.",
    calories: "69 calories per 100g",
    vitamins: ["Vitamin C", "Vitamin K", "Thiamine"],
    benefits: ["Rich in antioxidants", "Supports brain health", "Heart healthy"],
    funFact: "It takes about 2.5 pounds of grapes to make one bottle of wine.",
  },
  lemon: {
    name: "Lemon",
    description: "A sour citrus fruit used in cooking and beverages.",
    calories: "29 calories per 100g",
    vitamins: ["Vitamin C", "Vitamin B6", "Potassium"],
    benefits: ["Aids digestion", "Detoxifies the body", "Boosts immunity"],
    funFact: "Lemons contain more sugar than strawberries!",
  },
  pineapple: {
    name: "Pineapple",
    description: "A tropical fruit with a spiky exterior and sweet interior.",
    calories: "50 calories per 100g",
    vitamins: ["Vitamin C", "Manganese", "Vitamin B6"],
    benefits: ["Contains bromelain enzyme", "Supports digestion", "Anti-inflammatory"],
    funFact: "A pineapple takes 2-3 years to grow!",
  },
  watermelon: {
    name: "Watermelon",
    description: "A refreshing summer fruit that's 92% water.",
    calories: "30 calories per 100g",
    vitamins: ["Vitamin A", "Vitamin C", "Potassium"],
    benefits: ["Hydrating", "Good for skin", "Supports heart health"],
    funFact: "Watermelon is both a fruit and a vegetable!",
  },
  mango: {
    name: "Mango",
    description: "A sweet tropical fruit known as the 'king of fruits'.",
    calories: "60 calories per 100g",
    vitamins: ["Vitamin A", "Vitamin C", "Folate"],
    benefits: ["Boosts immunity", "Promotes eye health", "Improves digestion"],
    funFact: "Mangoes are related to cashews and pistachios!",
  },
  peach: {
    name: "Peach",
    description: "A fuzzy stone fruit with sweet, juicy flesh.",
    calories: "39 calories per 100g",
    vitamins: ["Vitamin C", "Vitamin A", "Potassium"],
    benefits: ["Good for skin", "Aids digestion", "Supports immune system"],
    funFact: "China produces 58% of the world's peaches!",
  },
};

// Keywords to match MobileNet predictions to fruits
const fruitKeywords: Record<string, string[]> = {
  apple: ["apple", "granny smith", "red delicious", "gala"],
  banana: ["banana"],
  orange: ["orange", "citrus", "tangerine", "mandarin"],
  strawberry: ["strawberry"],
  grape: ["grape", "grapes"],
  lemon: ["lemon", "lime", "citrus"],
  pineapple: ["pineapple"],
  watermelon: ["watermelon", "melon"],
  mango: ["mango"],
  peach: ["peach", "nectarine"],
};

export const matchFruit = (prediction: string): FruitInfo | null => {
  const lowerPrediction = prediction.toLowerCase();
  
  for (const [fruit, keywords] of Object.entries(fruitKeywords)) {
    for (const keyword of keywords) {
      if (lowerPrediction.includes(keyword)) {
        return fruitDatabase[fruit];
      }
    }
  }
  
  return null;
};

export const generateSpeechText = (info: FruitInfo): string => {
  return `This is a ${info.name}. ${info.description} It has ${info.calories}. 
    Key vitamins include ${info.vitamins.join(", ")}. 
    Health benefits: ${info.benefits.join(". ")}. 
    Fun fact: ${info.funFact}`;
};
