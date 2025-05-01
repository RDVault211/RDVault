// script.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ————————— Supabase Init —————————
const SUPABASE_URL = 'https://uegbyvcdwxnbdohvtmqi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZ2J5dmNkd3huYmRvaHZ0bXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNjgyMjYsImV4cCI6MjA2MTY0NDIyNn0.o8-Qi4mRQmZBGgVq0Aw7d2dB0qqO9uQBZfZCRuxmUys';
const supabase     = createClient(SUPABASE_URL, SUPABASE_KEY);

// ————————— Caches & State —————————
let productsCache = [];

// ————————— DOM References —————————
// Buyer
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
// Admin
const loginBtn      = document.getElementById('login-btn');
const logoutBtn     = document.getElementById('logout-btn');
const logout2Btn    = document.getElementById('logout2-btn');
const authSection   = document.getElementById('auth-section');
const adminPanel    = document.getElementById('admin-panel');
const newName       = document.getElementById('new-name');
const newPrice      = document.getElementById('new-price');
const newCategory   = document.getElementById('new-category');
const addProdBtn    = document.getElementById('add-product-btn');
const adminProducts = document.getElementById('admin-products');
const ordersCash    = document.getElementById('orders-cash');
const ordersTrans   = document.getElementById('orders-transfer');

// ————————— Admin Auth —————————
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

// ————————— Init Admin & Realtime —————————
async function initAdmin() {
  await loadProducts();
  await loadOrders();

  // subscribe to product table changes
  supabase
    .channel('products-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
      loadProducts();
    })
    .subscribe();

  // subscribe to new orders
  supabase
    .channel('orders-channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
      const o = payload.new;
      alert(`📥 Pesanan baru dari ${o.buyer_name}: ${o.product_name}`);
      loadOrders();
    })
    .subscribe();
}

// ————————— Load & Render Products —————————
async function loadProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('category', { ascending: true });
  if (error) {
    console.error('Error loading products:', error);
    return;
  }
  productsCache = data;
  renderCategoryFilters();
  renderProductsList(productsCache);
  renderProductSelect(productsCache);
  renderAdminProductList(productsCache);
}

// render dropdowns
function renderCategoryFilters() {
  const cats = ['all', ...new Set(productsCache.map(p => p.category))];
  // buyer filter
  categoryFilter.innerHTML = '';
  cats.forEach(c => categoryFilter.add(new Option(c==='all'?'Semua':c, c)));
  categoryFilter.onchange = () => {
    const sel = categoryFilter.value;
    renderProductsList(sel==='all' ? productsCache : productsCache.filter(p => p.category===sel));
  };
  // order form category
  orderCategory.innerHTML = '<option value="" disabled selected>Pilih kategori...</option>';
  cats.slice(1).forEach(c => orderCategory.add(new Option(c, c)));
  orderCategory.onchange = () => {
    const sel = orderCategory.value;
    const filtered = productsCache.filter(p => p.category===sel);
    renderProductsList(filtered);
    renderProductSelect(filtered);
    const showServer = sel==='Topup ML';
    document.getElementById('label-server').classList.toggle('hidden', !showServer);
    serverInput.classList.toggle('hidden', !showServer);
  };
}

// buyer list
function renderProductsList(list) {
  productList.innerHTML = '';
  list.forEach(p => {
    const div = document.createElement('div');
    div.className = 'product-item';
    div.innerHTML = `<strong>${p.name}</strong><br>Rp ${p.price}<br><em>${p.category}</em>`;
    productList.appendChild(div);
  });
}

// buyer select
function renderProductSelect(list) {
  productSelect.innerHTML = '<option value="" disabled selected>Pilih produk...</option>';
  list.forEach(p => {
    const opt = new Option(p.name, p.id);
    opt.dataset.price = p.price;
    productSelect.append(opt);
  });
  productSelect.onchange = () => {
    totalPriceEl.textContent = `Total: Rp ${productSelect.selectedOptions[0].dataset.price}`;
  };
}

// ————————— Admin: CRUD Produk —————————
// render admin list
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

// admin add
addProdBtn.onclick = async () => {
  const name     = newName.value.trim();
  const price    = parseInt(newPrice.value, 10);
  const category = newCategory.value;
  if (!name || !price || !category) return alert('Isi nama, harga, kategori.');
  const { error } = await supabase.from('products').insert([{ name, price, category }]);
  if (error) return alert('Gagal tambah produk: ' + error.message);
  newName.value = '';
  newPrice.value = '';
  // force refresh for buyer immediately
  await loadProducts();
};

// ————————— Admin: Load Orders —————————
async function loadOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error loading orders:', error);
    return;
  }
  ordersCash.innerHTML = '';
  ordersTrans.innerHTML = '';
  data.forEach(o => {
    const li = document.createElement('li');
    const label = o.category==='Topup ML'
      ? `Server ID: ${o.server_id}`
      : `ID Game: ${o.game_id}`;
    li.textContent = `${new Date(o.created_at).toLocaleString()} — ${label} — ${o.product_name}`;
    if (o.payment_method==='cash') ordersCash.appendChild(li);
    else ordersTrans.appendChild(li);
  });
}

// ——— Buyer: Handle Pemesanan ———
orderForm.onsubmit = async e => {
  e.preventDefault();
  const prodOpt = productSelect.selectedOptions[0];
  if (!prodOpt) return alert('Pilih produk.');

  const product_id = prodOpt.value;
  const product = productsCache.find(p => p.id === product_id);
  if (!product) return alert('Produk tidak ditemukan.');

  const category = orderCategory.value;
  const payment_method = payMethodSelect.value;
  const buyer_name = buyerInput.value.trim();
  const game_id = idInput.value.trim();
  const server_id = serverInput.classList.contains('hidden') ? '' : serverInput.value.trim();
  const secret = secretInput.value.trim();

  if (!category || !buyer_name || !game_id || !payment_method) {
    return alert('Isi semua data.');
  }

  if (payment_method === 'cash') {
    const { data: setting, error: setError } = await supabase.from('settings').select('*').eq('key', 'secret').single();
    if (setError) return alert('Gagal validasi kode rahasia.');
    if (secret !== setting.value) return alert('Kode rahasia salah.');
  }

  const { error } = await supabase.from('orders').insert([{
    category,
    product_name: product.name,
    payment_method,
    buyer_name,
    game_id,
    server_id,
  }]);

  if (error) {
    alert('Gagal menyimpan pesanan: ' + error.message);
    return;
  }

  alert('Pesanan berhasil dikirim!');

  if (payment_method === 'transfer') {
    const pesan = `Halo admin, saya ingin melakukan pemesanan:\n\n` +
      `Nama: ${buyer_name}\n` +
      `Kategori: ${category}\n` +
      `Produk: ${product.name}\n` +
      `ID Game: ${game_id}${server_id ? `\nServer ID: ${server_id}` : ''}\n` +
      `Metode: Transfer`;
    const waLink = `https://wa.me/6281335761181?text=${encodeURIComponent(pesan)}`;
    window.open(waLink, '_blank');
  }

  orderForm.reset();
  totalPriceEl.textContent = 'Total: Rp 0';
};
