import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase Init
const supabase = createClient(
  'https://uegbyvcdwxnbdohvtmqi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZ2J5dmNkd3huYmRvaHZ0bXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNjgyMjYsImV4cCI6MjA2MTY0NDIyNn0.o8-Qi4mRQmZBGgVq0Aw7d2dB0qqO9uQBZfZCRuxmUys'
);

// DOM Elements
const categoryFilter = document.getElementById('category-filter');
const orderCategory = document.getElementById('order-category');
const productList = document.getElementById('product-list');
const productSelect = document.getElementById('product');
const totalPriceEl = document.getElementById('total-price');
const orderForm = document.getElementById('order-form');
const idInput = document.getElementById('id_game');
const serverInput = document.getElementById('server_id');
const buyerInput = document.getElementById('buyer_name');
const payMethodSelect = document.getElementById('payment_method');
const secretInput = document.getElementById('secret');

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const logout2Btn = document.getElementById('logout2-btn');
const authSection = document.getElementById('auth-section');
const adminPanel = document.getElementById('admin-panel');
const newName = document.getElementById('new-name');
const newPrice = document.getElementById('new-price');
const newCategory = document.getElementById('new-category');
const addProdBtn = document.getElementById('add-product-btn');
const adminProducts = document.getElementById('admin-products');
const ordersCash = document.getElementById('orders-cash');
const ordersTrans = document.getElementById('orders-transfer');

let productsCache = [];

// Auth
loginBtn.onclick = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert('Login gagal: ' + error.message);
  authSection.classList.add('hidden');
  adminPanel.classList.remove('hidden');
  await initAdmin();
};
logoutBtn.onclick = logout2Btn.onclick = () => location.reload();

// Init Admin
async function initAdmin() {
  await loadProducts();
  await loadOrders();

  supabase.channel('products')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, loadProducts)
    .subscribe();

  supabase.channel('orders')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
      const o = payload.new;
      alert(`📥 Pesanan baru dari ${o.buyer_name}: ${o.product_name}`);
      loadOrders();
    })
    .subscribe();
}

// Load Products
async function loadProducts() {
  const { data, error } = await supabase.from('products').select('*').order('category');
  if (error) return console.error(error);
  productsCache = data;
  renderCategoryFilters();
  renderProductsList(productsCache);
  renderProductSelect(productsCache);
  renderAdminProductList(productsCache);
}

function renderCategoryFilters() {
  const cats = ['all', ...new Set(productsCache.map(p => p.category))];
  categoryFilter.innerHTML = '';
  cats.forEach(c => categoryFilter.add(new Option(c === 'all' ? 'Semua' : c, c)));
  categoryFilter.onchange = () => {
    const sel = categoryFilter.value;
    renderProductsList(sel === 'all' ? productsCache : productsCache.filter(p => p.category === sel));
  };

  orderCategory.innerHTML = '<option disabled selected>Pilih kategori...</option>';
  cats.slice(1).forEach(c => orderCategory.add(new Option(c, c)));
  orderCategory.onchange = () => {
    const sel = orderCategory.value;
    const list = productsCache.filter(p => p.category === sel);
    renderProductsList(list);
    renderProductSelect(list);
    document.getElementById('label-server').classList.toggle('hidden', sel !== 'Topup ML');
    serverInput.classList.toggle('hidden', sel !== 'Topup ML');
  };
}

function renderProductsList(list) {
  productList.innerHTML = '';
  list.forEach(p => {
    const div = document.createElement('div');
    div.className = 'product-item';
    div.innerHTML = `<strong>${p.name}</strong><br>Rp ${p.price}<br><em>${p.category}</em>`;
    productList.appendChild(div);
  });
}

productSelect.onchange = updateTotalPrice;
quantityInput.oninput = updateTotalPrice;

function updateTotalPrice() {
  const selected = productSelect.selectedOptions[0];
  const price = selected?.dataset.price;
  const qty = parseInt(quantityInput.value) || 1;

  if (price) {
    const total = parseInt(price) * qty;
    totalPriceEl.textContent = `Total: Rp ${total}`;
  } else {
    totalPriceEl.textContent = '';
  }
}

// Admin Produk
function renderAdminProductList(list) {
  adminProducts.innerHTML = '';
  list.forEach(p => {
    const div = document.createElement('div');
    div.className = 'admin-item';
    div.innerHTML = `
      ${p.category} — <strong>${p.name}</strong> — Rp ${p.price}
      <button data-id="${p.id}" class="del-btn">Hapus</button>
    `;
    adminProducts.appendChild(div);
  });
  adminProducts.querySelectorAll('.del-btn').forEach(btn => {
    btn.onclick = async () => {
      await supabase.from('products').delete().eq('id', btn.dataset.id);
    };
  });
}

addProdBtn.onclick = async () => {
  const name = newName.value.trim();
  const price = parseInt(newPrice.value, 10);
  const category = newCategory.value;
  if (!name || !price || !category) return alert('Isi semua data.');
  const { error } = await supabase.from('products').insert([{ name, price, category }]);
  if (error) return alert('Gagal tambah produk: ' + error.message);
  newName.value = '';
  newPrice.value = '';
};

// Load Orders
async function loadOrders() {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (error) return console.error(error);
  ordersCash.innerHTML = '';
  ordersTrans.innerHTML = '';
  data.forEach(o => {
    const li = document.createElement('li');
    const info = o.category === 'Topup ML' ? `Server ID: ${o.server_id}` : `ID: ${o.game_id}`;
    li.textContent = `${new Date(o.created_at).toLocaleString()} — ${info} — ${o.product_name}`;
    if (o.payment_method === 'cash') ordersCash.appendChild(li);
    else ordersTrans.appendChild(li);
  });
}

orderForm.onsubmit = async e => {
  e.preventDefault();

  const prodOpt = productSelect.selectedOptions[0];
  if (!prodOpt) return alert('Pilih produk.');

  const product_id = prodOpt.value;
  const product_name = prodOpt.text;
  const price = parseInt(prodOpt.dataset.price);
  const game_id = idInput.value.trim();
  const server_id = serverInput.value.trim();
  const buyer_name = buyerInput.value.trim();
  const payment_method = payMethodSelect.value;
  const secret = secretInput.value.trim();
  const category = orderCategory.value;
  const quantityInput = document.getElementById('quantity');
  const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

  if (!buyer_name || !game_id || !product_id || !payment_method || !category || isNaN(quantity) || quantity < 1) {
    return alert('Lengkapi semua data dengan benar.');
  }

  if (payment_method === 'cash') {
    const { data: secrets } = await supabase.from('secrets').select('*');
    const valid = secrets.some(s => s.code === secret);
    if (!valid) return alert('Kode rahasia salah.');
  }

  const totalPrice = price * quantity;

  const { error } = await supabase.from('orders').insert([{
    product_id,
    product_name,
    price: totalPrice,
    quantity,
    game_id,
    server_id,
    buyer_name,
    payment_method,
    category
  }]);

  if (error) return alert('Gagal menyimpan pesanan: ' + error.message);

  alert('Pemesanan berhasil!');

  // Redirect ke WhatsApp jika kategori Joki MLBB atau metode transfer
  if (category === 'Joki MLBB' || payment_method === 'transfer') {
    const info = category === 'Topup ML' ? `Server ID: ${server_id}` : `ID: ${game_id}`;
    const text = `Halo Admin, saya ${buyer_name} ingin memesan ${quantity}x ${product_name} untuk ${info}`;
    const url = `https://wa.me/6281335761181?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  orderForm.reset();
  totalPriceEl.textContent = '';
};

