// script.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase initialization
const SUPABASE_URL = 'https://uegbyvcdwxnbdohvtmqi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZ2J5dmNkd3huYmRvaHZ0bXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNjgyMjYsImV4cCI6MjA2MTY0NDIyNn0.o8-Qi4mRQmZBGgVq0Aw7d2dB0qqO9uQBZfZCRuxmUys';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM elements
const categoryFilter = document.getElementById('category-filter');
const orderCategory   = document.getElementById('order-category');
const productList     = document.getElementById('product-list');
const productSelect   = document.getElementById('product');
const totalPriceEl    = document.getElementById('total-price');
const orderForm       = document.getElementById('order-form');
const idInput         = document.getElementById('id_game');
const serverInput     = document.getElementById('server_id');
const buyerInput      = document.getElementById('buyer_name');
const payMethodSelect = document.getElementById('payment_method');
const secretInput     = document.getElementById('secret');

// Admin elements
const loginBtn     = document.getElementById('login-btn');
const logoutBtn    = document.getElementById('logout-btn');
const logout2Btn   = document.getElementById('logout2-btn');
const authSection  = document.getElementById('auth-section');
const adminPanel   = document.getElementById('admin-panel');
const newName      = document.getElementById('new-name');
const newPrice     = document.getElementById('new-price');
const newCategory  = document.getElementById('new-category');
const addProdBtn   = document.getElementById('add-product-btn');
const adminProducts= document.getElementById('admin-products');
const ordersCash   = document.getElementById('orders-cash');
const ordersTransfer = document.getElementById('orders-transfer');

// Authenticate admin
loginBtn.onclick = async () => {
  const email = document.getElementById('email').value;
  const pass  = document.getElementById('password').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) return alert('Login gagal: ' + error.message);
  authSection.classList.add('hidden');
  adminPanel.classList.remove('hidden');
  init();
};
logoutBtn.onclick = logout2Btn.onclick = () => location.reload();

// Initialize data & subscriptions
async function init() {
  await loadProducts();
  await loadOrders();

  // Real-time product updates
  supabase.channel('products')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, _ => loadProducts())
    .subscribe();

  // Real-time order notifications
  supabase.channel('orders')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
      const o = payload.new;
      alert(`📥 Pesanan baru dari ${o.buyer_name} (${o.category}: ${o.product_name})`);
      loadOrders();
    })
    .subscribe();
}

// Load products from DB
async function loadProducts() {
  const { data: products, error } = await supabase.from('products').select('*').order('category');
  if (error) return console.error(error);
  renderCategoryFilters(products);
  renderProductsList(products);
  renderProductsSelect(products);
}

// Render category dropdowns
function renderCategoryFilters(products) {
  const cats = Array.from(new Set(products.map(p => p.category)));
  categoryFilter.innerHTML = `<option value="all">Semua</option>`;
  orderCategory.innerHTML  = `<option value="" disabled selected>Pilih kategori...</option>`;
  cats.forEach(c => {
    categoryFilter.add(new Option(c, c));
    orderCategory.add(new Option(c, c));
  });
  categoryFilter.onchange = () => {
    const sel = categoryFilter.value;
    renderProductsList(sel === 'all' ? products : products.filter(p => p.category === sel));
  };
  orderCategory.onchange = () => {
    const sel = orderCategory.value;
    const filtered = products.filter(p => p.category === sel);
    renderProductsList(filtered);
    renderProductsSelect(filtered);
    // Show server field only for Topup ML
    if (sel === 'Topup ML') {
      document.getElementById('label-server').classList.remove('hidden');
      serverInput.classList.remove('hidden');
    } else {
      document.getElementById('label-server').classList.add('hidden');
      serverInput.classList.add('hidden');
    }
  };
}

// Render product cards for display
function renderProductsList(products) {
  productList.innerHTML = '';
  products.forEach(p => {
    const div = document.createElement('div');
    div.className = 'product-item';
    div.innerHTML = `<strong>${p.name}</strong><br>Rp ${p.price}<br><em>${p.category}</em>`;
    productList.appendChild(div);
  });
}

// Render product select in order form
function renderProductsSelect(products) {
  productSelect.innerHTML = `<option value="" disabled selected>Pilih produk...</option>`;
  products.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id; opt.text = p.name; opt.dataset.price = p.price;
    productSelect.appendChild(opt);
  });
  productSelect.onchange = () => {
    totalPriceEl.textContent = `Total: Rp ${productSelect.selectedOptions[0].dataset.price}`;
  };
}

// Handle order submission
orderForm.onsubmit = async e => {
  e.preventDefault();
  const prodOpt = productSelect.selectedOptions[0];
  const price   = +prodOpt.dataset.price;
  const method  = payMethodSelect.value;
  const idGame  = idInput.value.trim();
  const srvId   = serverInput.value.trim();
  const buyer   = buyerInput.value.trim();
  const secret  = secretInput.value.trim();
  // validate
  if (!prodOpt) return alert('Pilih produk terlebih dahulu.');
  if (!idGame && orderCategory.value!=='Topup ML') return alert('Masukkan ID Game.');
  if (orderCategory.value==='Topup ML' && !srvId) return alert('Masukkan Server ID.');
  if (method==='cash') {
    const { data: s } = await supabase.from('settings').select('value').eq('key','secret').single();
    if (s.value !== secret) return alert('Kode rahasia salah!');
    await supabase.from('orders').insert([{
      category: orderCategory.value,
      product_name: prodOpt.text,
      buyer_name: buyer,
      game_id: idGame,
      server_id: srvId,
      payment_method: method
    }]);
    alert(`Pesanan berhasil! Total: Rp ${price}`);
  } else {
    const text = encodeURIComponent(
      `Halo, saya mau top-up.\nProduk: ${prodOpt.text}\nTotal: Rp ${price}\n` +
      `${orderCategory.value==='Topup ML' ? 'Server ID: '+srvId : 'ID Game: '+idGame}`
    );
    window.location.href = `https://wa.me/6281335761181?text=${text}`;
  }
};

// Load orders for admin view
async function loadOrders() {
  const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  ordersCash.innerHTML = '';
  ordersTransfer.innerHTML = '';
  orders.forEach(o => {
    const li = document.createElement('li');
    const label = o.category==='Topup ML'
      ? `Server ID: ${o.server_id}`
      : `ID Game: ${o.game_id}`;
    li.textContent = `${new Date(o.created_at).toLocaleString()} — ${label} — ${o.product_name}`;
    if (o.payment_method==='cash') ordersCash.appendChild(li);
    else ordersTransfer.appendChild(li);
  });
}

// On page load: fetch products (for public view)
window.onload = () => {
  loadProducts();
};


