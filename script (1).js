import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  'https://uegbyvcdwxnbdohvtmqi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZ2J5dmNkd3huYmRvaHZ0bXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNjgyMjYsImV4cCI6MjA2MTY0NDIyNn0.o8-Qi4mRQmZBGgVq0Aw7d2dB0qqO9uQBZfZCRuxmUys'
);

// Elements
const loginBtn = document.getElementById('login-btn'),
      logoutBtn = document.getElementById('logout-btn'),
      logout2Btn = document.getElementById('logout2-btn'),
      authSection = document.getElementById('auth-section'),
      adminPanel = document.getElementById('admin-panel'),
      buyerBtn = document.getElementById('btn-view-orders'),
      buyerInput = document.getElementById('buyer-id-input'),
      buyerList = document.getElementById('buyer-orders-list'),
      productList = document.getElementById('product-list'),
      categoryFilter = document.getElementById('category-filter'),
      orderCategory = document.getElementById('order-category'),
      productSelect = document.getElementById('product'),
      orderForm = document.getElementById('order-form'),
      ordersCash = document.getElementById('orders-cash'),
      ordersTransfer = document.getElementById('orders-transfer');

// Auth
loginBtn.onclick = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: document.getElementById('email').value,
    password: document.getElementById('password').value
  });
  if (error) return alert('Login gagal: ' + error.message);
  authSection.classList.add('hidden');
  adminPanel.classList.remove('hidden');
  initData();
};
logoutBtn.onclick = logout2Btn.onclick = () => location.reload();

// Init data
async function initData() {
  await fetchProducts();
  await fetchOrders();
}

// Fetch & Realtime products
async function fetchProducts() {
  const { data: products } = await supabase.from('products').select('*').order('category');
  renderCategories(products);
  renderProductList(products);
}
supabase.channel('products')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchProducts())
  .subscribe();

// Fetch & Realtime orders with notification
async function fetchOrders() {
  const { data: orders } = await supabase.from('orders').select('*').order('created_at');
  renderOrders(orders);
}
supabase.channel('orders')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
    const o = payload.new;
    alert(`📥 Pesanan baru dari ${o.buyer_name} untuk ${o.product_name}`);
    fetchOrders();
  })
  .subscribe();

// Render category filters
function renderCategories(products) {
  const cats = [...new Set(products.map(p => p.category))];
  categoryFilter.innerHTML = '<option value="all">Semua</option>';
  orderCategory.innerHTML = '<option value="" disabled selected>Pilih kategori...</option>';
  cats.forEach(c => {
    const opt = document.createElement('option'); opt.value = c; opt.text = c;
    categoryFilter.appendChild(opt);
    const opt2 = opt.cloneNode(true);
    orderCategory.appendChild(opt2);
  });
  categoryFilter.onchange = () => {
    const filtered = categoryFilter.value === 'all'
      ? products
      : products.filter(p => p.category === categoryFilter.value);
    renderProductList(filtered);
  };
  orderCategory.onchange = () => {
    const selectedCat = orderCategory.value;
    renderProductSelect(products.filter(p => p.category === selectedCat));
    // Show or hide server_id based on category
    if (selectedCat === 'Topup ML') {
      document.getElementById('label-server').classList.remove('hidden');
      document.getElementById('server_id').classList.remove('hidden');
    } else {
      document.getElementById('label-server').classList.add('hidden');
      document.getElementById('server_id').classList.add('hidden');
    }
  };
}

// Render product list (buyer)
function renderProductList(products) {
  productList.innerHTML = '';
  products.forEach(p => {
    const div = document.createElement('div');
    div.className = 'product-item';
    div.innerHTML = `<strong>${p.name}</strong><br>Rp ${p.price}<br><em>${p.category}</em>`;
    productList.appendChild(div);
  });
}

// Render order form products
function renderProductSelect(products) {
  productSelect.innerHTML = '<option value="" disabled selected>Pilih produk...</option>';
  products.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id; opt.text = p.name;
    opt.dataset.category = p.category;
    productSelect.appendChild(opt);
  });
}

// Place order
orderForm.onsubmit = async e => {
  e.preventDefault();
  const cat = orderCategory.value;
  const prodOpt = productSelect.selectedOptions[0];
  const prodName = prodOpt.text;
  const idGame = document.getElementById('id_game').value;
  const serverId = document.getElementById('server_id').value || '';
  const buyerName = document.getElementById('buyer_name').value;
  const paymentMethod = document.getElementById('payment_method').value;
  const secret = document.getElementById('secret').value;
  const { data: setting } = await supabase.from('settings').select('value').eq('key', 'secret').single();
  if (paymentMethod === 'cash' && secret !== setting.value) return alert('Kode rahasia salah!');
  await supabase.from('orders').insert([{ category: cat, product_name: prodName, buyer_name: buyerName, game_id: idGame, server_id: serverId, payment_method: paymentMethod }]);
  alert('Pesanan berhasil!');
};

// Render orders (admin)
function renderOrders(orders) {
  ordersCash.innerHTML = '';
  ordersTransfer.innerHTML = '';
  orders.forEach(o => {
    const li = document.createElement('li');
    const label = o.category === 'Topup ML' ? `Server ID: ${o.server_id}` : `ID Game: ${o.game_id}`;
    li.textContent = `${label} - ${o.buyer_name} - ${o.product_name}`;
    if (o.payment_method === 'cash') ordersCash.appendChild(li); else ordersTransfer.appendChild(li);
  });
}

// Initial load (public view)
window.onload = () => {
  fetchProducts();
};
