import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase init
const SUPABASE_URL = 'https://uegbyvcdwxnbdohvtmqi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZ2J5dmNkd3huYmRvaHZ0bXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNjgyMjYsImV4cCI6MjA2MTY0NDIyNn0.o8-Qi4mRQmZBGgVq0Aw7d2dB0qqO9uQBZfZCRuxmUys';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM elements
const loginBtn       = document.getElementById('login-btn');
const logoutBtn      = document.getElementById('logout-btn');
const logout2Btn     = document.getElementById('logout2-btn');
const authSection    = document.getElementById('auth-section');
const adminPanel     = document.getElementById('admin-panel');
const newName        = document.getElementById('new-name');
const newPrice       = document.getElementById('new-price');
const newCategory    = document.getElementById('new-category');
const addProdBtn     = document.getElementById('add-product-btn');
const adminProducts  = document.getElementById('admin-products');

// Buyer-side & order form elements...
const categoryFilter = document.getElementById('category-filter');
const orderCategory  = document.getElementById('order-category');
const productList    = document.getElementById('product-list');
const productSelect  = document.getElementById('product');
const totalPriceEl   = document.getElementById('total-price');
const orderForm      = document.getElementById('order-form');
const idInput        = document.getElementById('id_game');
const serverInput    = document.getElementById('server_id');
const buyerInput     = document.getElementById('buyer_name');
const payMethod      = document.getElementById('payment_method');
const secretInput    = document.getElementById('secret');
const ordersCash     = document.getElementById('orders-cash');
const ordersTrans    = document.getElementById('orders-transfer');

// Admin authentication
loginBtn.onclick = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert('Login gagal: ' + error.message);
  authSection.classList.add('hidden');
  adminPanel.classList.remove('hidden');
  initAdmin();
};
logoutBtn.onclick = logout2Btn.onclick = () => location.reload();

// Initialize admin panel: load & subscribe
async function initAdmin() {
  await loadProducts();     // populate product lists
  await loadOrders();       // populate existing orders

  // real-time product updates
  supabase
    .channel('products')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadProducts())
    .subscribe();

  // real-time order notifications
  supabase
    .channel('orders')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
      const o = payload.new;
      alert(`📥 Pesanan baru dari ${o.buyer_name}: ${o.product_name}`);
      loadOrders();
    })
    .subscribe();
}

// Fetch and render products
async function loadProducts() {
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('category', { ascending: true });
  if (error) return console.error(error);
  renderCategoryFilters(products);
  renderProductList(products);
  renderProductSelect(products);
  renderAdminProductList(products);
}

// Admin: render list of products with delete buttons
function renderAdminProductList(products) {
  adminProducts.innerHTML = '';
  products.forEach(p => {
    const div = document.createElement('div');
    div.className = 'admin-item';
    div.innerHTML = `
      ${p.category} — <strong>${p.name}</strong> — Rp ${p.price}
      <button data-id="${p.id}" class="del-btn">Hapus</button>
    `;
    adminProducts.appendChild(div);
  });
  // attach delete handlers
  adminProducts.querySelectorAll('.del-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      await supabase.from('products').delete().eq('id', id);
    };
  });
}

// Admin: add product handler
addProdBtn.onclick = async () => {
  const name     = newName.value.trim();
  const price    = parseInt(newPrice.value, 10);
  const category = newCategory.value;
  if (!name || !price || !category) {
    return alert('Isi nama, harga, dan kategori produk.');
  }
  const { error } = await supabase
    .from('products')
    .insert([{ name, price, category }]);
  if (error) return alert('Gagal tambah produk: ' + error.message);
  newName.value = '';
  newPrice.value = '';
};

// Fetch and render orders (admin)
async function loadOrders() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return console.error(error);
  ordersCash.innerHTML = '';
  ordersTrans.innerHTML = '';
  orders.forEach(o => {
    const li = document.createElement('li');
    const label = o.category === 'Topup ML'
      ? `Server ID: ${o.server_id}` 
      : `ID Game: ${o.game_id}`;
    li.textContent = `${new Date(o.created_at).toLocaleString()} — ${label} — ${o.product_name}`;
    if (o.payment_method === 'cash') ordersCash.appendChild(li);
    else ordersTrans.appendChild(li);
  });
}

// Buyer-side load on page load
window.onload = () => loadProducts();

// [Omitted: buyer-side order form code, same as sebelumya]
