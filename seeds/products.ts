exports.seed = function(knex: any) {
  // Deletes ALL existing entries
  return knex('products').del()
    .then(function () {
      // Inserts seed entries
      return knex('products').insert(
        products.map(product => {
          return {
            ...product,
            created_at: new Date(),
            updated_at: new Date(),
          }
        })
      )
  })
}

// category_id: 1 = Coffee, 2 = Non-Coffee, 3 = Bakery (ตัดสินใจใช้แบบ hardcode ตาม
// backendapi.md ข้อ 3 เพราะไม่มีตาราง categories จริงใน database — ใช้สำหรับสาธิต
// Challenge 2 (Filter: Coffee / Non-Coffee / Bakery) ใน plan.md ข้อ 57 ได้ด้วย
// status_id: 1 = Active/Available เสมอ (ไม่มีตาราง statuses จริงเช่นกัน)
// user_id: 1 อ้างอิงถึง Demo User คนแรกที่สมัครผ่าน POST /api/auth/register
const products = [
  // --- Coffee (category_id: 1) ---
  {
    name: 'Americano',
    description: 'Espresso shots topped with hot water for a light, bold coffee',
    barcode: 'COFFEE001',
    image: 'americano.jpg',
    stock: 20,
    price: 55,
    category_id: 1,
    user_id: 1,
    status_id: 1,
  },
  {
    name: 'Espresso',
    description: 'Concentrated coffee brewed by forcing hot water through finely-ground beans',
    barcode: 'COFFEE002',
    image: 'espresso.jpg',
    stock: 20,
    price: 50,
    category_id: 1,
    user_id: 1,
    status_id: 1,
  },
  {
    name: 'Cappuccino',
    description: 'Espresso with steamed milk and a thick layer of milk foam',
    barcode: 'COFFEE003',
    image: 'cappuccino.jpg',
    stock: 20,
    price: 65,
    category_id: 1,
    user_id: 1,
    status_id: 1,
  },
  {
    name: 'Caffe Latte',
    description: 'Espresso with a generous amount of steamed milk and light foam',
    barcode: 'COFFEE004',
    image: 'caffe_latte.jpg',
    stock: 20,
    price: 70,
    category_id: 1,
    user_id: 1,
    status_id: 1,
  },
  {
    name: 'Mocha',
    description: 'Espresso with chocolate syrup and steamed milk, topped with whipped cream',
    barcode: 'COFFEE005',
    image: 'mocha.jpg',
    stock: 20,
    price: 75,
    category_id: 1,
    user_id: 1,
    status_id: 1,
  },
  {
    name: 'Iced Americano',
    description: 'Chilled espresso and water served over ice',
    barcode: 'COFFEE006',
    image: 'iced_americano.jpg',
    stock: 20,
    price: 60,
    category_id: 1,
    user_id: 1,
    status_id: 1,
  },
  {
    name: 'Iced Latte',
    description: 'Espresso with cold milk served over ice',
    barcode: 'COFFEE007',
    image: 'iced_latte.jpg',
    stock: 20,
    price: 75,
    category_id: 1,
    user_id: 1,
    status_id: 1,
  },

  // --- Non-Coffee (category_id: 2) ---
  {
    name: 'Matcha Latte',
    description: 'Japanese green tea powder blended with steamed milk',
    barcode: 'COFFEE008',
    image: 'matcha_latte.jpg',
    stock: 20,
    price: 80,
    category_id: 2,
    user_id: 1,
    status_id: 1,
  },
  {
    name: 'Thai Milk Tea',
    description: 'Classic Thai-style strong black tea with milk and sugar',
    barcode: 'COFFEE009',
    image: 'thai_milk_tea.jpg',
    stock: 20,
    price: 60,
    category_id: 2,
    user_id: 1,
    status_id: 1,
  },
  {
    name: 'Hot Chocolate',
    description: 'Steamed milk with rich cocoa and chocolate syrup',
    barcode: 'COFFEE010',
    image: 'hot_chocolate.jpg',
    stock: 20,
    price: 65,
    category_id: 2,
    user_id: 1,
    status_id: 1,
  },
  {
    name: 'Lemon Tea',
    description: 'Refreshing black tea with fresh lemon, served cold',
    barcode: 'COFFEE011',
    image: 'lemon_tea.jpg',
    stock: 20,
    price: 55,
    category_id: 2,
    user_id: 1,
    status_id: 1,
  },

  // --- Bakery (category_id: 3) ---
  {
    name: 'Butter Croissant',
    description: 'Flaky, buttery French pastry baked fresh daily',
    barcode: 'COFFEE012',
    image: 'butter_croissant.jpg',
    stock: 15,
    price: 45,
    category_id: 3,
    user_id: 1,
    status_id: 1,
  },
  {
    name: 'Chocolate Muffin',
    description: 'Soft muffin loaded with chocolate chips',
    barcode: 'COFFEE013',
    image: 'chocolate_muffin.jpg',
    stock: 15,
    price: 40,
    category_id: 3,
    user_id: 1,
    status_id: 1,
  },
  {
    name: 'Blueberry Cheesecake',
    description: 'Creamy cheesecake slice topped with blueberry compote',
    barcode: 'COFFEE014',
    image: 'blueberry_cheesecake.jpg',
    stock: 10,
    price: 85,
    category_id: 3,
    user_id: 1,
    status_id: 1,
  },
]