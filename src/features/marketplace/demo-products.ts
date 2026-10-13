export type RentalProduct = {
  id: string;
  name: string;
  collection: string;
  category: string;
  price: number;
  rentalPeriod: string;
  image: string;
  description: string;
};

export const demoProducts: RentalProduct[] = [
  {
    id: "demo-1",
    name: "The Midnight Edit",
    collection: "Evening collection",
    category: "Evening wear",
    price: 1299,
    rentalPeriod: "4 days",
    image:
      "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=85",
    description: "An elegant statement look for special evenings.",
  },
  {
    id: "demo-2",
    name: "The Modern Muse",
    collection: "Occasion collection",
    category: "Wedding guest",
    price: 999,
    rentalPeriod: "4 days",
    image:
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=85",
    description: "A polished look for weddings and celebrations.",
  },
  {
    id: "demo-3",
    name: "The Soft Statement",
    collection: "Contemporary collection",
    category: "Evening wear",
    price: 1499,
    rentalPeriod: "4 days",
    image:
      "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=800&q=85",
    description: "A contemporary outfit with an elegant silhouette.",
  },
  {
    id: "demo-4",
    name: "The Celebration Edit",
    collection: "Occasion collection",
    category: "Wedding guest",
    price: 1199,
    rentalPeriod: "4 days",
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=85",
    description: "A standout look for your next celebration.",
  },
  {
    id: "demo-5",
    name: "The Everyday Muse",
    collection: "Contemporary collection",
    category: "Everyday chic",
    price: 799,
    rentalPeriod: "4 days",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=85",
    description: "An easy, versatile look for casual occasions.",
  },
  {
    id: "demo-6",
    name: "The Evening Grace",
    collection: "Evening collection",
    category: "Evening wear",
    price: 1799,
    rentalPeriod: "4 days",
    image:
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=85",
    description: "An occasion-ready look for a memorable night.",
  },
];