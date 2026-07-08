/* WOY — capa de datos compartida (cliente + admin)
   Todo vive en localStorage bajo una sola llave. Sin backend en la beta.
   Catálogo: Hacienda Los Molinos (Boquete). */
(function (global) {
  "use strict";

  var KEY = "woy_data_v7"; // v7: opciones internas bilingües + temas de color

  /* ---------- Semilla por defecto ---------- */
  function seed() {
    return {
      brand: {
        name: "Hacienda Los Molinos",
        tagline: "Boquete, Panamá",
        logoEmoji: "🌿"
      },
      theme: {
        accent: "#4a5d3a",
        accent2: "#c9a15a",
        font: "sans"
      },
      settings: { defaultLang: "es", currency: "$" },
      info: {
        phone1: "730-8313",
        phone2: "6676-0653",
        instagram: "haciendalosmolinos",
        facebook: "haciendalosmolinos",
        services: "Servicios especiales y pedidos a domicilio: llámanos para coordinar tu evento o entrega.",
        servicesEn: "Special services and home delivery: call us to arrange your event or order."
      },
      promo: {
        enabled: true,
        emoji: "📞",
        title: "Reservas",
        titleEn: "Reservations",
        text: "Reserva tu mesa al 730-8313 ó 6676-0653.",
        textEn: "Book your table at 730-8313 or 6676-0653."
      },
      categories: [
        { id: "entradas", name: "Entradas", nameEn: "Appetizers", emoji: "🥗" },
        { id: "principales", name: "Principales", nameEn: "Mains", emoji: "🍽️" },
        { id: "emparedados", name: "Emparedados", nameEn: "Sandwiches", emoji: "🥪" },
        { id: "ninos", name: "Menú de niños", nameEn: "Kids menu", emoji: "🧒" },
        { id: "desayunos", name: "Desayunos", nameEn: "Breakfast", emoji: "🍳" },
        { id: "arma-desayuno", name: "Arma tu desayuno", nameEn: "Build your breakfast", emoji: "🥞" },
        { id: "bebidas", name: "Bebidas", nameEn: "Drinks", emoji: "☕" }
      ],
      dishes: [
        /* ---------- ENTRADAS ---------- */
        {
          id: "e1", catId: "entradas", name: "Sopa de cebolla",
          nameEn: "Onion Soup",
          descEn: "Beef stock, caramelized yellow onions, swiss cheese and ciabatta bread.",
          desc: "Caldo de res, cebollas caramelizadas, queso suizo y tostón de pan ciabatta.",
          price: 8.9, emoji: "🧅", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "e2", catId: "entradas", name: "Sancocho a nuestra manera",
          nameEn: "Chicken Stew — Sancocho our style",
          descEn: "Panamanian chicken soup, with yam (ñame) texture and confit hen.",
          desc: "Caldo de pollo, textura de ñame y gallina de patio confitada.",
          price: 7.9, emoji: "🍲", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "e3", catId: "entradas", name: "Ensalada Hidropónica del Huerto",
          nameEn: "Hydroponic Garden Salad",
          descEn: "Hydroponic mesclun, tomatoes, avocado, radish and naranjilla dressing.",
          desc: "Mézclum hidropónico, tomates, aguacate, rábano y aderezo de naranjilla.",
          price: 10.9, emoji: "🥗", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [],
          mods: [
            { name: "Con pollo", nameEn: "With chicken", price: 0 },
            { name: "Con salmón ahumado", nameEn: "With smoked salmon", price: 0 }
          ]
        },
        {
          id: "e4", catId: "entradas", name: "Carpaccio de hongos Portobello",
          nameEn: "Portobello Mushroom Carpaccio",
          descEn: "Confit portobello mushrooms, arugula salad, parmesan cheese, dried cranberries and balsamic vinaigrette. Vegan friendly.",
          desc: "Hongos portobello confitados, ensaladilla de rúcula, queso parmesano, arándanos secos y vinagreta balsámica. Apto para veganos.",
          price: 9, emoji: "🍄", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          tags: ["vegano"],
          sizes: [], mods: []
        },
        {
          id: "e5", catId: "entradas", name: "Carpaccio de Res",
          nameEn: "Beef Carpaccio",
          descEn: "Angus beef, ground olives, capers, arugula, anchovy mayonnaise, truffle and annatto oil.",
          desc: "Carne Angus, tierra de aceitunas, alcaparras, rúcula, mayonesa de anchoas, queso parmesano, aceite de trufas y aceite de achiote.",
          price: 9, emoji: "🥩", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "e6", catId: "entradas", name: "Ceviche de Pescado con maracuyá",
          nameEn: "Passion Fruit Fish Ceviche",
          descEn: "Fish, almonds, chili flakes, passion fruit jam and crispy tortilla.",
          desc: "Pescado, almendras, hojuelas de chile, mermelada de maracuyá y crocante de tortilla.",
          price: 9.9, emoji: "🐟", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: true,
          sizes: [], mods: []
        },
        {
          id: "e7", catId: "entradas", name: "Empanadas de Lengua",
          nameEn: "Beef Tongue Empanadas",
          descEn: "Beef tongue empanadas cooked at low temperature with pepperjack cheese and garlic mayonnaise.",
          desc: "Lengua de res cocinada a baja temperatura, sofrito panameño, queso pepperjack, acompañadas de mayonesa de ajo.",
          price: 8.9, emoji: "🥟", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "e8", catId: "entradas", name: "Empanadas de Osobuco",
          nameEn: "Ossobuco Empanadas",
          descEn: "Ossobuco cooked at low temperature, pepperjack cheese and chimichurri empanadas.",
          desc: "Osobuco cocinado a baja temperatura, queso pepperjack, acompañado de chimichurri.",
          price: 8.9, emoji: "🥟", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "e9", catId: "entradas", name: "Patacones con Chorizo",
          nameEn: "Plantains & Chorizo",
          descEn: "Sautéed chorizo, pico de gallo, ranch and chipotle sauce.",
          desc: "Chorizo criollo salteado, pico de gallo y salsa ranch.",
          price: 8.9, emoji: "🍌", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "e10", catId: "entradas", name: "Patacones con Pulpo",
          nameEn: "Plantains & Octopus",
          descEn: "Crispy plantains with octopus in Caribbean sauce with pickled onions.",
          desc: "Pulpo en sofrito caribeño y cebollas encurtidas.",
          price: 12, emoji: "🐙", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "e11", catId: "entradas", name: "Almejas al ajillo",
          nameEn: "Garlic Clams",
          descEn: "Sautéed clams in garlic and white wine with cherry tomatoes, served with artisanal bread.",
          desc: "Almejas salteadas en ajo, vino blanco y tomate cherry, acompañadas de pan artesanal.",
          price: 10.9, emoji: "🦪", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "e12", catId: "entradas", name: "Camarones con pimentón",
          nameEn: "Spicy Shrimp",
          descEn: "Accompanied by plantain chips. Choose your preparation.",
          desc: "Acompañados de chips de plátano. Elige tu preparación.",
          price: 10.9, emoji: "🍤", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          tags: ["picante"],
          sizes: [
            { label: "Mantequilla de ajo", labelEn: "Garlic butter", delta: 0 },
            { label: "Estilo caribeño", labelEn: "Caribbean style", delta: 0 }
          ],
          mods: []
        },
        {
          id: "e13", catId: "entradas", name: "Trío de Hummus",
          nameEn: "Hummus Trio",
          descEn: "Beet, chickpea and pumpkin hummus, accompanied by pita bread. Vegetarian.",
          desc: "Hummus de remolacha, garbanzo y zapallo, acompañados de pan pita. Vegetariano.",
          price: 6.9, emoji: "🫓", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          tags: ["vegetariano"],
          sizes: [], mods: []
        },
        {
          id: "e14", catId: "entradas", name: "Berenjena Asada",
          nameEn: "Roasted Eggplant",
          descEn: "Baba ganush, cherry tomato, feta cheese and arugula salad. Vegan friendly.",
          desc: "Babaganush, tomate cherry, queso feta y ensalada de rúcula. Apto para veganos.",
          price: 10, emoji: "🍆", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          tags: ["vegano"],
          sizes: [], mods: []
        },

        /* ---------- PRINCIPALES ---------- */
        {
          id: "p1", catId: "principales", name: "Trucha Boqueteña",
          nameEn: "Boquete Trout",
          descEn: "Spinach-filled trout fillet with pesto sauce, yellow chili pepper and garlic-confit baby potatoes.",
          desc: "Filete de trucha relleno de espinaca con salsa pesto, espejo de ají amarillo y papines salteados en ajo.",
          price: 17.9, emoji: "🐟", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: true,
          sizes: [], mods: []
        },
        {
          id: "p2", catId: "principales", name: "Salmón a la parrilla",
          nameEn: "Grilled Salmon",
          descEn: "Grilled salmon, guandú risotto with fresh coconut and strawberry sauce.",
          desc: "Salmón a la parrilla, risotto de guandú y coco fresco con salsa de fresas.",
          price: 19.9, emoji: "🍣", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "p3", catId: "principales", name: "Filete de Corvina",
          nameEn: "Oven-baked Corvina Fillet",
          descEn: "Oven-baked corvina fillet served on a paprika purée with basil oil, accompanied by Caribbean rice made with black beans, bell pepper, onion, and coconut oil.",
          desc: "Filete de corvina al horno en espejo de pimentón y aceite de albahaca, acompañado de arroz caribeño (frijoles negros, pimentón, cebolla y aceite de coco).",
          price: 23.9, emoji: "🐠", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "p4", catId: "principales", name: "Pasta con Langostinos",
          nameEn: "Pasta with Prawns",
          descEn: "Linguini with prawns in a white wine and butter reduction.",
          desc: "Linguini con langostinos en reducción de mantequilla y vino blanco.",
          price: 18.9, emoji: "🍝", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "p5", catId: "principales", name: "Pulpo a la Parrilla",
          nameEn: "Grilled Octopus",
          descEn: "Octopus seasoned with paprika, garlic, parsley, annatto, and white wine, served with textured mashed potatoes.",
          desc: "Pulpo sazonado en paprika, ajo, perejil, achiote y vino blanco, acompañado de puré de papas en texturas.",
          price: 20.9, emoji: "🐙", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "p6", catId: "principales", name: "Pollo de la Casa",
          nameEn: "Molinos-style Chicken",
          descEn: "Smoked and roasted at low temperature leg quarter chicken in Jerk seasoning, accompanied by chaufa rice.",
          desc: "Muslo encuentro en sazón Jerk, ahumado y asado a baja temperatura, acompañado de arroz chaufa.",
          price: 12.9, emoji: "🍗", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "p7", catId: "principales", name: "Pasta & Zapallo",
          nameEn: "Pasta & Pumpkin",
          descEn: "Penne with roasted pumpkin sauce, roasted seeds, coconut and almonds. Vegan friendly.",
          desc: "Penne con salsa de zapallo rostizado, semillas rostizadas, coco y almendras. Apto para veganos.",
          price: 14.9, emoji: "🎃", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          tags: ["vegano"],
          sizes: [], mods: []
        },
        {
          id: "p8", catId: "principales", name: "Costillas de cerdo",
          nameEn: "Pork Ribs",
          descEn: "Pork ribs in a house tamarind BBQ, accompanied by plantain chips.",
          desc: "Costillas de cerdo en BBQ de tamarindo de la casa, acompañadas de chips de plátano.",
          price: 18.9, emoji: "🍖", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "p9", catId: "principales", name: "Short Ribs en BBQ Koreana",
          nameEn: "Korean BBQ Short Ribs",
          descEn: "Boneless strip roast cooked at low temperature on a ripe plantain purée with Panamanian cheese.",
          desc: "Asado de tira cocinado a baja temperatura sobre un puré de plátano maduro con queso del país confitado.",
          price: 22, emoji: "🥩", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: true,
          tags: ["halal"],
          sizes: [], mods: []
        },
        {
          id: "p10", catId: "principales", name: "Osobuco en salsa de vino",
          nameEn: "Ossobuco in Red Wine Sauce",
          descEn: "Ossobuco cooked at low temperature over a truffled portobello risotto.",
          desc: "Osobuco cocinado en reducción de vino tinto a baja temperatura sobre risotto de hongo portobello trufado.",
          price: 18.9, emoji: "🍷", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "p11", catId: "principales", name: "Entraña Angus",
          nameEn: "Angus Skirt Steak",
          descEn: "Accompanied with Greek salad or wok sautéed vegetables.",
          desc: "Acompañada con ensalada griega ó vegetales salteados al wok.",
          price: 26.9, emoji: "🥩", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [
            { label: "6 oz", labelEn: "6 oz", delta: 0 },
            { label: "12 oz", labelEn: "12 oz", delta: 10 }
          ],
          mods: [
            { name: "Ensalada griega", nameEn: "Greek salad", price: 0 },
            { name: "Vegetales al wok", nameEn: "Wok vegetables", price: 0 }
          ]
        },
        {
          id: "p12", catId: "principales", name: "Ribeye Angus 10 oz",
          nameEn: "Ribeye Angus 10 oz",
          descEn: "Accompanied with Greek salad or wok sautéed vegetables.",
          desc: "Acompañado con ensalada griega ó vegetales salteados al wok.",
          price: 31.9, emoji: "🥩", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [],
          mods: [
            { name: "Ensalada griega", nameEn: "Greek salad", price: 0 },
            { name: "Vegetales al wok", nameEn: "Wok vegetables", price: 0 }
          ]
        },
        {
          id: "p13", catId: "principales", name: "New York Angus 12 oz",
          nameEn: "New York Angus 12 oz",
          descEn: "Accompanied with Greek salad or wok sautéed vegetables.",
          desc: "Acompañado con ensalada griega ó vegetales salteados al wok.",
          price: 26.9, emoji: "🥩", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          tags: ["halal"],
          sizes: [],
          mods: [
            { name: "Ensalada griega", nameEn: "Greek salad", price: 0 },
            { name: "Vegetales al wok", nameEn: "Wok vegetables", price: 0 }
          ]
        },
        {
          id: "p14", catId: "principales", name: "Filete Criollo 8 oz",
          nameEn: "Creole Beef Tenderloin 8 oz",
          descEn: "Grilled beef fillet with sautéed asparagus, cherry tomato, bathed in crimini mushroom demi-glace and crispy beetroot, accompanied by truffled purée.",
          desc: "Filete de res a la parrilla con espárragos salteados, tomate cherry, bañado en demi glace de hongos crimini y crocante de remolacha, acompañado de puré trufado.",
          price: 20.9, emoji: "🥩", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },

        /* ---------- EMPAREDADOS ---------- */
        {
          id: "s1", catId: "emparedados", name: "Wrap de Pollo o Vegetales",
          nameEn: "Chicken or Vegetable Wrap",
          descEn: "Breaded chicken, bacon, lettuce, tomato and onion wrap with ranch and chipotle sauce, served with French fries.",
          desc: "Pollo apanado, tocino, lechuga, tomate y cebolla, con salsas ranch y chipotle. Con papas fritas.",
          price: 9.9, emoji: "🌯", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          ingredients: [{ name: "Tocino", nameEn: "Bacon" }, { name: "Lechuga", nameEn: "Lettuce" }, { name: "Tomate", nameEn: "Tomato" }, { name: "Cebolla", nameEn: "Onion" }, { name: "Salsa ranch", nameEn: "Ranch sauce" }, { name: "Salsa chipotle", nameEn: "Chipotle sauce" }],
          sizes: [
            { label: "De pollo", labelEn: "Chicken", delta: 0 },
            { label: "De vegetales", labelEn: "Vegetable", delta: 0 }
          ],
          mods: []
        },
        {
          id: "s2", catId: "emparedados", name: "Philly Cheese Steak",
          nameEn: "Philly Cheese Steak",
          descEn: "Ciabatta bread with steak strips sautéed with paprika, white onions and gratin Pepper Jack cheese, served with French fries.",
          desc: "Pan ciabatta con tiras de filete de res salteadas con pimentón, cebolla blanca y queso Pepper Jack gratinado. Con papas fritas.",
          price: 12.9, emoji: "🥪", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "s3", catId: "emparedados", name: "Canyon Burger",
          nameEn: "Canyon Burger",
          descEn: "Brioche bread, Angus beef, mushrooms, fried plantain, sweet onions, mozzarella cheese and chipotle sauce, served with French fries.",
          desc: "Pan artesanal con carne de res Angus, hongos, patacón, cebolla dulce, queso mozzarella y salsa chipotle. Con papas fritas.",
          price: 12.9, emoji: "🍔", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          ingredients: [{ name: "Hongos", nameEn: "Mushrooms" }, { name: "Patacón", nameEn: "Fried plantain" }, { name: "Cebolla dulce", nameEn: "Sweet onion" }, { name: "Queso mozzarella", nameEn: "Mozzarella cheese" }, { name: "Salsa chipotle", nameEn: "Chipotle sauce" }],
          sizes: [], mods: []
        },
        {
          id: "s4", catId: "emparedados", name: "Hamburguesa de la Casa",
          nameEn: "Molinos Burger",
          descEn: "Brioche bread, Angus beef, homemade sesame sauce, lettuce, truffled mozzarella cheese, bacon jam and yam chips, served with French fries.",
          desc: "Pan artesanal, carne de res Angus, salsa casera de sésamo, lechuga, queso mozzarella trufado, mermelada de tocino y chips de ñame. Con papas fritas.",
          price: 12.9, emoji: "🍔", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: true,
          ingredients: [{ name: "Lechuga", nameEn: "Lettuce" }, { name: "Queso mozzarella trufado", nameEn: "Truffled mozzarella" }, { name: "Mermelada de tocino", nameEn: "Bacon jam" }, { name: "Chips de ñame", nameEn: "Yam chips" }, { name: "Salsa de sésamo", nameEn: "Sesame sauce" }],
          sizes: [], mods: []
        },

        /* ---------- MENÚ DE NIÑOS ---------- */
        {
          id: "k1", catId: "ninos", name: "Deditos de pollo",
          nameEn: "Chicken Fingers",
          descEn: "Chicken fingers served with French fries, ketchup and honey mustard.",
          desc: "Pollo apanado acompañado de papas fritas con ketchup y honey mustard.",
          price: 8, emoji: "🍗", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "k2", catId: "ninos", name: "Queso hamburguesa",
          nameEn: "Cheeseburger",
          descEn: "Artisanal bread, Angus beef, cheddar cheese and ketchup, served with French fries.",
          desc: "Pan artesanal, carne de res Angus, queso amarillo y ketchup, acompañada de papas fritas.",
          price: 8, emoji: "🍔", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "k3", catId: "ninos", name: "Pasta con pollo",
          nameEn: "Chicken Pasta",
          descEn: "Linguine or penne with grilled chicken and a choice of sauce.",
          desc: "Linguine o penne con pollo a la plancha y salsa a escoger.",
          price: 12.9, emoji: "🍝", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [],
          mods: [
            { name: "Salsa óleo", nameEn: "Olive-oil sauce", price: 0 },
            { name: "Salsa blanca", nameEn: "White sauce", price: 0 },
            { name: "Salsa pomodoro", nameEn: "Pomodoro sauce", price: 0 }
          ]
        },

        /* ---------- DESAYUNOS ---------- */
        {
          id: "br1", catId: "desayunos", name: "Tostada Mediterránea",
          nameEn: "Mediterranean Toast",
          descEn: "Sourdough bread, guacamole, cherry tomatoes and confit mushrooms, scrambled eggs and onion cream.",
          desc: "Pan de masa madre, guacamole, tomate cherry y hongos confitados, huevos revueltos y crema de cebolla.",
          price: 7.9, emoji: "🥑", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: true,
          sizes: [], mods: []
        },
        {
          id: "br2", catId: "desayunos", name: "Huevos rancheros",
          nameEn: "Ranch-style Eggs",
          descEn: "Fried eggs in ranchera sauce with jalapeño oil, served with tortilla chips or tostadas, topped with local cheese.",
          desc: "Huevos fritos en salsa ranchera con aceite de jalapeños, acompañados de totopos o tostadas, coronados con queso del país.",
          price: 6.9, emoji: "🍳", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [
            { label: "Con totopos", labelEn: "With tortilla chips", delta: 0 },
            { label: "Con tostadas", labelEn: "With tostadas", delta: 0 }
          ],
          mods: []
        },
        {
          id: "br3", catId: "desayunos", name: "Croissant de la casa",
          nameEn: "House Croissant",
          descEn: "Caramelized onions, guacamole purée, scrambled eggs and rosé sauce, topped with bacon.",
          desc: "Cebollas caramelizadas, puré de guacamole, huevos revueltos, salsa rosada, coronado con tocino.",
          price: 7.9, emoji: "🥐", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "br4", catId: "desayunos", name: "Filete a lo panameño",
          nameEn: "Panamanian-style Steak",
          descEn: "Beef fillet, Creole sauce and mixed vegetables, accompanied by almojábanos and grilled pressed cheese.",
          desc: "Filete de res, salsa criolla, mix de vegetales, acompañado de almojábanos y queso prensado asado.",
          price: 10.9, emoji: "🥩", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "br5", catId: "desayunos", name: "Smoothie de frutas de temporada",
          nameEn: "Seasonal Fruit Smoothie",
          descEn: "Almond milk, a mix of fruits with nuts and mint, topped with honey.",
          desc: "Leche de almendras, mix de frutas con frutos secos y hierbabuena, coronado con miel.",
          price: 6.9, emoji: "🥤", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "br6", catId: "desayunos", name: "Desayuno americano",
          nameEn: "American Breakfast",
          descEn: "Seasonal fruits, scrambled eggs, local cheese and toast, juice and specialty coffee.",
          desc: "Frutas de temporada, huevos revueltos, queso del país y tostadas, jugo y café de especialidad.",
          price: 10.9, emoji: "🌅", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "br7", catId: "desayunos", name: "Pancake de chocoavellana",
          nameEn: "Chocolate Hazelnut Pancake",
          descEn: "Chocolate pancakes with strawberry syrup, scrambled eggs and bacon.",
          desc: "Pancakes con chocolate, sirope de fresas, huevos revueltos y tocino.",
          price: 8.9, emoji: "🥞", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "br8", catId: "desayunos", name: "Omelette con vegetales",
          nameEn: "Vegetable Omelet",
          descEn: "Mixed vegetables and mozzarella cheese omelet, served with toast.",
          desc: "Omelette de vegetales mixtos y queso mozzarella, acompañado de tostadas.",
          price: 8.5, emoji: "🫑", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },

        /* ---------- ARMA TU DESAYUNO ---------- */
        {
          id: "ab1", catId: "arma-desayuno", name: "Display de frutas",
          nameEn: "Fruit Platter",
          descEn: "Fresh seasonal fruit.",
          desc: "Frutas frescas de temporada.",
          price: 6.5, emoji: "🍓", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "ab2", catId: "arma-desayuno", name: "Huevos fritos o revueltos",
          nameEn: "Fried or Scrambled Eggs",
          descEn: "Your way: fried or scrambled.",
          desc: "A tu gusto: fritos o revueltos.",
          price: 3.9, emoji: "🥚", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [
            { label: "Fritos", labelEn: "Fried", delta: 0 },
            { label: "Revueltos", labelEn: "Scrambled", delta: 0 }
          ],
          mods: []
        },
        {
          id: "ab3", catId: "arma-desayuno", name: "Omelette simple",
          nameEn: "Plain Omelet",
          descEn: "Classic egg omelet.",
          desc: "Omelette clásico de huevo.",
          price: 3.9, emoji: "🍳", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "ab4", catId: "arma-desayuno", name: "Waffles",
          nameEn: "Waffles",
          descEn: "Freshly made waffles.",
          desc: "Waffles recién hechos.",
          price: 3, emoji: "🧇", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "ab5", catId: "arma-desayuno", name: "Pancakes",
          nameEn: "Pancakes",
          descEn: "Fluffy pancakes.",
          desc: "Pancakes esponjosos.",
          price: 3, emoji: "🥞", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "ab6", catId: "arma-desayuno", name: "Tortilla o hojaldra",
          nameEn: "Tortilla or Fried Bread",
          descEn: "Panamanian breakfast classics.",
          desc: "Clásicos panameños del desayuno.",
          price: 1.5, emoji: "🫓", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [
            { label: "Tortilla", labelEn: "Tortilla", delta: 0 },
            { label: "Hojaldra", labelEn: "Fried bread", delta: 0 }
          ],
          mods: []
        },
        {
          id: "ab7", catId: "arma-desayuno", name: "Tostadas francesas",
          nameEn: "French Toast",
          descEn: "Golden French toast.",
          desc: "Tostadas francesas doradas.",
          price: 4, emoji: "🍞", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "ab8", catId: "arma-desayuno", name: "Tocino",
          nameEn: "Bacon",
          descEn: "Crispy bacon strips.",
          desc: "Tiras de tocino crujiente.",
          price: 3, emoji: "🥓", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "ab9", catId: "arma-desayuno", name: "Queso blanco",
          nameEn: "White Cheese",
          descEn: "Local white cheese.",
          desc: "Queso blanco del país.",
          price: 2.5, emoji: "🧀", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "ab10", catId: "arma-desayuno", name: "Torrejitas de maíz",
          nameEn: "Corn Fritters",
          descEn: "Homemade corn fritters.",
          desc: "Torrejitas de maíz caseras.",
          price: 1.75, emoji: "🌽", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },

        /* ---------- BEBIDAS ---------- */
        {
          id: "bv1", catId: "bebidas", name: "Café Americano",
          nameEn: "Americano",
          descEn: "Specialty coffee from the region.",
          desc: "Café de especialidad de la región.",
          price: 2.75, emoji: "☕", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "bv2", catId: "bebidas", name: "Capuccino",
          nameEn: "Cappuccino",
          descEn: "Espresso with steamed milk foam.",
          desc: "Espresso con leche espumada.",
          price: 3.5, emoji: "☕", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "bv3", catId: "bebidas", name: "Mocaccino",
          nameEn: "Mocha",
          descEn: "Espresso with chocolate and steamed milk.",
          desc: "Espresso con chocolate y leche espumada.",
          price: 3.5, emoji: "🍫", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "bv4", catId: "bebidas", name: "Café con leche",
          nameEn: "Coffee with Milk",
          descEn: "House coffee with milk.",
          desc: "Café de la casa con leche.",
          price: 3.5, emoji: "🥛", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "bv5", catId: "bebidas", name: "Chocolate caliente",
          nameEn: "Hot Chocolate",
          descEn: "Creamy hot chocolate.",
          desc: "Chocolate caliente cremoso.",
          price: 5, emoji: "🍫", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "bv6", catId: "bebidas", name: "Filtrados",
          nameEn: "Filtered Coffee",
          descEn: "Specialty filtered coffee methods. Price by method: $5.00 – $9.00.",
          desc: "Café de especialidad en métodos filtrados. Precio según método: $5.00 – $9.00.",
          price: 5, emoji: "🫖", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        },
        {
          id: "bv7", catId: "bebidas", name: "Jugos naturales",
          nameEn: "Fresh Juices",
          descEn: "Fresh seasonal fruit juice. Price by fruit: $2.50 – $3.50.",
          desc: "Jugo natural de frutas de temporada. Precio según fruta: $2.50 – $3.50.",
          price: 2.5, emoji: "🧃", img: "",
          kcal: 0, timeMin: 0, rating: 0, available: true, featured: false,
          sizes: [], mods: []
        }
      ],
      tables: [
        { id: "01", label: "Mesa 01" },
        { id: "02", label: "Mesa 02" },
        { id: "03", label: "Mesa 03" },
        { id: "04", label: "Mesa 04" },
        { id: "05", label: "Mesa 05" },
        { id: "06", label: "Mesa 06" }
      ]
    };
  }

  /* ---------- Multi-cliente ----------
     Sin ?c= en la URL → cliente por defecto (Hacienda, ya publicado).
     Con ?c=slug → datos aislados de ese restaurante (llave namespaced). */
  function tenantId() {
    try {
      var c = new global.URLSearchParams(global.location.search).get("c") || "";
      c = c.replace(/[^a-z0-9-]/gi, "").toLowerCase();
      return c || null;
    } catch (e) { return null; }
  }
  function keyFor(tid) {
    return tid ? KEY + "__" + tid : KEY;
  }

  /* Semilla en blanco para un restaurante nuevo (la usa el panel de dueño). */
  function blankSeed(name) {
    return {
      brand: { name: name || "Mi Restaurante", tagline: "", logoEmoji: "🍽️" },
      theme: { accent: "#c2410c", accent2: "#f59e0b", font: "sans" },
      settings: { defaultLang: "es", currency: "$" },
      info: { phone1: "", phone2: "", instagram: "", facebook: "", services: "", servicesEn: "" },
      promo: { enabled: false, emoji: "🎉", title: "", titleEn: "", text: "", textEn: "" },
      categories: [
        { id: "entradas", name: "Entradas", nameEn: "Appetizers", emoji: "🥗" },
        { id: "principales", name: "Platos fuertes", nameEn: "Mains", emoji: "🍽️" },
        { id: "bebidas", name: "Bebidas", nameEn: "Drinks", emoji: "🥤" }
      ],
      dishes: [],
      tables: [
        { id: "01", label: "Mesa 01" },
        { id: "02", label: "Mesa 02" },
        { id: "03", label: "Mesa 03" },
        { id: "04", label: "Mesa 04" }
      ]
    };
  }

  /* ---------- Lectura / escritura (por cliente) ---------- */
  function load(tid) {
    if (tid === undefined) tid = tenantId();
    try {
      var raw = global.localStorage.getItem(keyFor(tid));
      if (!raw) {
        var s = tid ? blankSeed(tid) : seed();
        save(s, tid);
        return s;
      }
      return JSON.parse(raw);
    } catch (e) {
      return tid ? blankSeed(tid) : seed();
    }
  }

  function save(data, tid) {
    if (tid === undefined) tid = tenantId();
    try {
      global.localStorage.setItem(keyFor(tid), JSON.stringify(data));
    } catch (e) {
      /* almacenamiento lleno o bloqueado: la beta sigue en memoria */
    }
  }

  function reset(tid) {
    if (tid === undefined) tid = tenantId();
    var s = tid ? blankSeed(tid) : seed();
    save(s, tid);
    return s;
  }

  /* ---------- Registro de clientes (panel de dueño) ---------- */
  var CLIENTS_KEY = "woy_clients";
  function loadClients() {
    try { return JSON.parse(global.localStorage.getItem(CLIENTS_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveClients(list) {
    try { global.localStorage.setItem(CLIENTS_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function uid(prefix) {
    return (prefix || "id") + "-" + Math.random().toString(36).slice(2, 8);
  }

  /* Etiquetas disponibles para los platos (se muestran sobre la foto). */
  var TAGS = [
    { id: "picante", label: "Picante", labelEn: "Spicy", emoji: "\ud83c\udf36\ufe0f" },
    { id: "vegano", label: "Vegan friendly", labelEn: "Vegan friendly", emoji: "\ud83c\udf31" },
    { id: "vegetariano", label: "Vegetariana 100%", labelEn: "100% Vegetarian", emoji: "\ud83e\udd6c" },
    { id: "keto", label: "Keto", labelEn: "Keto", emoji: "\ud83e\udd51" },
    { id: "sin-gluten", label: "Sin gluten", labelEn: "Gluten free", emoji: "\ud83c\udf3e" },
    { id: "sin-lactosa", label: "Sin lactosa", labelEn: "Lactose free", emoji: "\ud83e\udd5b" },
    { id: "halal", label: "Halal 100%", labelEn: "Halal 100%", emoji: "\u262a\ufe0f" }
  ];

  global.WOY = {
    KEY: KEY,
    TAGS: TAGS,
    load: load,
    save: save,
    reset: reset,
    seed: seed,
    blankSeed: blankSeed,
    uid: uid,
    tenantId: tenantId,
    keyFor: keyFor,
    loadClients: loadClients,
    saveClients: saveClients
  };
})(window);
