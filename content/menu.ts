/**
 * Catering menu. Edit titles and dish names here — the Menu page reads this file.
 * The sample list is taken from the menu cards on marwadikhana.in.
 */
export type MenuGroup = {
  name: string;
  items: string[];
};

export type MenuCategory = {
  id: string;
  title: string;
  items?: string[];
  groups?: MenuGroup[];
};

export const menuIntro =
  "Royal Rajasthani vegetarian cooking, with North Indian dishes for gatherings across Delhi NCR. Every menu can be customised for your occasion, guest count and preferences. Padharo mhaare des.";

export const menu: MenuCategory[] = [
  {
    id: "jhol-ki-sabji",
    title: "Jhol Ki Sabji",
    items: [
      "Panchmeli Dal",
      "Motimahal Dal (Dal Makhni)",
      "Jodhpuri Gatta Kari",
      "Govind Gatta",
      "Jhol ke Aaloo",
      "Papad Mangodi",
      "Palak Mangodi",
      "Aaloo Mangodi Ki Sabji",
      "Marwadi Kadi",
      "Marwad Ke Cholle",
      "Marwad Malaidaar Rajma",
      "Marwari Arhar Dal",
      "Chana Dal Dilpasand",
      "Jaisalmeri Chana",
      "Dahi Gawar Phali",
      "Kadi Pakodi",
      "Mangodi Kadi",
    ],
  },
  {
    id: "sukhi-sabji",
    title: "Sukhi Sabji",
    items: [
      "Bharwa Bhindi",
      "Bharwa Karela",
      "Bharwa Parwal",
      "Achari Aaloo",
      "Aaloo Pyaz",
      "Methi Aaloo",
      "Sukhe Gatte",
      "Khatta Meetha Kaddu",
      "Ker Sangri",
    ],
  },
  {
    id: "gravy-sabji",
    title: "Gravy Sabji",
    items: [
      "Methi Malai Mattar",
      "Jaisalmeri Chana",
      "Bharwa Tamatar",
      "Papad Capsicum",
      "Aaloo Gulab",
      "Aaloo Dum",
      "Mattar Paneer",
      "Malai Pyaz",
      "Malai Tinde",
      "Stuffed Tomato",
      "Aangoor Mokhana Sabji",
      "Achaari Paneer",
      "Paneer Laung Lata",
      "Sangri Ke Kofte",
      "Sev Tamatar",
      "Bhindi Do Pyaza",
      "Palak Paneer",
      "Dakh Daana Methi",
    ],
  },
  {
    id: "breads",
    title: "Breads / Roti",
    items: [
      "Bikaneri Paratha",
      "Pudina Paratha",
      "Mirch Paratha",
      "Jalebi Paratha",
      "Mishri Mawa Paratha",
      "Laccha Paratha",
      "Methi Paratha",
      "Phulka",
      "Poori (Matar, Bedmi, Saada)",
      "Namak Ajwain Paratha",
    ],
  },
  {
    id: "snacks",
    title: "Snacks",
    items: [
      "Cocktail Samosa",
      "Kalmi Vada",
      "Kachori",
      "Palak Pakode",
      "Mix Pakode",
      "Moong Dal Pakode",
      "Mirch Bada",
      "Gawar Phali Dhokli",
      "Hara Bhara Kabab",
      "Dahi Bade",
      "Pao Bhaji",
      "Cholle Bhatura",
      "Cholle Kulcha",
      "Kadi Kachori",
      "Mattar Kachori",
      "Pasta",
    ],
  },
  {
    id: "drinks",
    title: "Drinks",
    items: ["Chaach", "Raab (Makki / Bajre)", "Thandai", "Aam Panna", "Saffron Drink"],
  },
  {
    id: "raita",
    title: "Raita",
    items: ["Kishmish Raita", "Boondi Raita", "Lauki Raita", "Cheela Raita", "Pakodi Raita"],
  },
  {
    id: "chutneys",
    title: "Chutneys",
    items: [
      "Lehsun Chutney",
      "Hari Mirch Chutney",
      "Kairi ki Chutney",
      "Chuware Ki Chutney",
      "Dakh Khajoor Chutney",
    ],
  },
  {
    id: "rice",
    title: "Rice",
    items: [
      "Mangodi Pulav",
      "Gatta Pulav",
      "Dryfruit Pulav",
      "Shahi Marwadi Kesar Pulav (Meetha)",
      "Mattar Kaju Pulav",
    ],
  },
  {
    id: "combos",
    title: "Combos",
    groups: [
      {
        name: "Dal Bati Churma Meal",
        items: [
          "Panchmeli Dal",
          "Aata Churma",
          "Two Batis (plain / stuffed)",
          "Gatte ki Sabji",
          "Mirch Ke Tipore",
          "Lehsun Chatni",
        ],
      },
      {
        name: "Dal Bati Churma with Bikaneri Paratha",
        items: [
          "Panchmeli Dal",
          "Aata Churma",
          "Two Batis (plain / stuffed)",
          "Bikaneri Paratha (1)",
          "Kair Sangri",
          "Mirch ke Tipore",
          "Lehsun Chatni",
        ],
      },
    ],
  },
  {
    id: "sweets",
    title: "Sweets",
    items: [
      "Mango Churma",
      "Gulab Churma",
      "Besan Churma",
      "Sooji Churma",
      "Badam Churma",
      "Bajra Churma",
      "Jaggery Churma",
      "Kesariya Peda",
      "Baked Boondi",
      "Boondi",
      "Besan Ki Burfi",
      "Gulab Jamoon",
      "Rabdi (Mango, Apple)",
      "Kaju Katli",
      "Badam Katli",
      "Dryfruit Tiranga",
      "Besan Ladoo",
      "Aata Gaund Ladoo",
      "Boondi Ladoo",
      "Dryfruit Ladoo",
      "Nariyal Barfi",
      "Besan Halwa",
      "Sooji Halwa",
      "Badam Halwa",
      "Moong Dal Halwa",
      "Moti Pak",
      "Gaund Pak",
      "Gunjiya",
      "Pista Badam Khoya Halwa",
    ],
  },
];
