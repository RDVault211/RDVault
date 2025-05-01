import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase init
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

// Admin DOM
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

// Admin login/logout
loginBtn.onclick = async () => {
  const email = document.getElementById('email').value;
  const pass  = document.getElementById('password').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) return alert('Login gagal: ' + error.message);
  authSection.classList.add('hidden');
  adminPanel.classList.remove('hidden');
  initAdmin();
};
logoutBtn.onclick = logout2Btn.onclick = () => location.reload();

// Initialize admin data & realtime
async function initAdmin() {
  await loadProducts();
  await loadOrders();
  supabase.channel('products')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, _ => loadProducts())
    .subscribe();
  supabase.channel('orders')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
      const o = payload.new;
      alert(`📥 Pesanan baru dari ${o.buyer_name} (${o.category}: ${o.product_name})`);
      loadOrders();
    })
    .subscribe();
}

// Load & render products
async function loadProducts() {
  const { data: products } = await supabase.from('products').select('*').order('category');
  renderCategories(products);
  renderProductsList(products);
  renderProductSelect(products);
}

// Render category dropdowns
function renderCategories(products) {
  const cats = [...new Set(products.map(p => p.category))];
  categoryFilter.innerHTML = `<option value="all">Semua</option>`;
  orderCategory.innerHTML  = `<option value="" disabled selected>Pilih kategori...</option>`;
  cats.forEach(c => {
    categoryFilter.add(new Option(c, c));
    orderCategory.add(new Option(c, c));
  });
  categoryFilter.onchange = () => {
    const sel = categoryFilter.value;
    const filtered = sel==='all'? products: products.filter(p => p.category===sel);
    renderProductsList(filtered);
  };
  orderCategory.onchange = () => {
    const sel = orderCategory.value;
    const filtered = products.filter(p => p.category===sel);
    renderProductsList(filtered);
    renderProductSelect(filtered);
    // toggle Server ID field
    const show = sel==='Topup ML';
    document.getElementById('label-server').classList.toggle('hidden', !show);
    serverInput.classList.toggle('hidden', !show);
  };
}

// Render product cards
function renderProductsList(products) {
  productList.innerHTML = '';
  products.forEach(p => {
    const div = document.createElement('div');
    div.className = 'product-item';
    div.innerHTML = `<strong>${p.name}</strong><br>Rp ${p.price}<br><em>${p.category}</em>`;
    productList.appendChild(div);
  });
}

// Render select options for order
function renderProductSelect(products) {
  productSelect.innerHTML = `<option value="" disabled selected>Pilih produk...</option>`;
  products.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id; opt.text = p.name; opt.dataset.price = p.price;
    productSelect.append(opt);
  });
  productSelect.onchange = () => {
    totalPriceEl.textContent = `Total: Rp ${productSelect.selectedOptions[0].dataset.price}`;
  };
}

// Handle order submit
orderForm.onsubmit = async e => {
  e.preventDefault();
  const prodOpt = productSelect.selectedOptions[0];
  const price   = +prodOpt.dataset.price;
  const method  = payMethodSelect.value;
  const idGame  = idInput.value.trim();
  const srvId   = serverInput.value.trim();
  const buyer   = buyerInput.value.trim();
  const secret  = secretInput.value.trim();
  if (!prodOpt) return alert('Pilih produk terlebih dahulu.');
  if (orderCategory.value==='Topup ML' && !srvId) return alert('Masukkan Server ID.');
  if (orderCategory.value!=='Topup ML' && !idGame) return alert('Masukkan ID Game.');
  if (method==='cash') {
    const { data: s } = await supabase.from('settings').select('value').eq('key','secret').single();
    if (s.value!==secret) return alert('Kode rahasia salah!');
    await supabase.from('orders').insert([{
      category: orderCategory.value,
      product_name: prodOpt.text,
      buyer_name: buyer,
      game_id: orderCategory.value==='Topup ML'? null: idGame,
      server_id: orderCategory.value==='Topup ML'? srvId: null,
      payment_method: method
    }]);
    alert(`Pesanan berhasil! Total: Rp ${price}`);
  } else {
    const text = encodeURIComponent(
      `Halo, saya mau top-up.\nProduk: ${prodOpt.text}\nTotal: Rp ${price}\n` +
      `${orderCategory.value==='Topup ML'?'Server ID: '+srvId:'ID Game: '+idGame}`
    );
    window.location.href = `https://wa.me/6281335761181?text=${text}`;
  }
};

// Load & render orders (admin)
async function loadOrders() {
  const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  ordersCash.innerHTML = '';
  ordersTrans.innerHTML = '';
  orders.forEach(o => {
    const li = document.createElement('li');
    const label = o.category==='Topup ML'
      ? `Server ID: ${o.server_id}`
      : `ID Game: ${o.game_id}`;
    li.textContent = `${new Date(o.created_at).toLocaleString()} — ${label} — ${o.product_name}`;
    if (o.payment_method==='cash') ordersCash.appendChild(li);
    else ordersTrans.appendChild(li);
  });
}

// On load (public view)
window.onload = () => loadProducts();
