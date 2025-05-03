import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  'https://roiwwquzsyiwzifjvagc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaXd3cXV6c3lpd3ppZmp2YWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNDI1MDksImV4cCI6MjA2MTgxODUwOX0.r55cFBttjq259Sved86qScdouQbCFUDeIJCFbwCDkeA'
);

// DOM Elements
const elements = {
  productList: document.getElementById('product-list'),
  productSelect: document.getElementById('product'),
  categorySelect: document.getElementById('order-category'),
  totalPrice: document.getElementById('total-price'),
  quantityBox: document.getElementById('quantity-box'),
  quantityInput: document.getElementById('quantity'),
  serverId: document.getElementById('server_id'),
  labelServer: document.getElementById('label-server'),
  orderForm: document.getElementById('order-form'),
  buyerName: document.getElementById('buyer_name'),
  gameId: document.getElementById('id_game'),
  paymentMethod: document.getElementById('payment_method'),
  secret: document.getElementById('secret'),
  // Admin
  loginBtn: document.getElementById('login-btn'),
  logoutBtns: [document.getElementById('logout-btn'), document.getElementById('logout2-btn')],
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  authSection: document.getElementById('auth-section'),
  adminPanel: document.getElementById('admin-panel'),
  newName: document.getElementById('new-name'),
  newPrice: document.getElementById('new-price'),
  newCategory: document.getElementById('new-category'),
  addProductBtn: document.getElementById('add-product-btn'),
  adminProducts: document.getElementById('admin-products'),
  ordersCash: document.getElementById('orders-cash'),
  ordersTrans: document.getElementById('orders-transfer'),
};

let productsCache = [];

elements.loginBtn.onclick = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: elements.email.value,
    password: elements.password.value
  });
  if (error) return alert('Login gagal: ' + error.message);
  elements.authSection.classList.add('hidden');
  elements.adminPanel.classList.remove('hidden');
  await loadProducts();
  await loadOrders();
};

elements.logoutBtns.forEach(btn => btn.onclick = () => location.reload());

// Load Products
async function loadProducts() {
  const { data, error } = await supabase.from('products').select('*').order('category');
  if (error) return console.error(error);
  productsCache = data;
  renderCategorySelect();
  renderProductList();
  renderProductOptions();
  renderAdminList();
}

function renderCategorySelect() {
  const cats = [...new Set(productsCache.map(p => p.category))];
  elements.categorySelect.innerHTML = '<option disabled selected>Pilih kategori...</option>';
  cats.forEach(c => elements.categorySelect.add(new Option(c, c)));

  elements.categorySelect.onchange = () => {
    const cat = elements.categorySelect.value;
    renderProductList(cat);
    renderProductOptions(cat);

    const isML = cat === 'Topup ML';
    elements.serverId.classList.toggle('hidden', !isML);
    elements.labelServer.classList.toggle('hidden', !isML);
  };
}

function renderProductList(selectedCategory) {
  elements.productList.innerHTML = '';
  productsCache
    .filter(p => p.show !== false)
    .filter(p => !selectedCategory || p.category === selectedCategory)
    .forEach(p => {
      const box = document.createElement('div');
      box.className = 'product-item';
      box.innerHTML = `<strong>${p.name}</strong><br>Rp ${p.price}<br><em>${p.category}</em>`;
      elements.productList.appendChild(box);
    });
}

function renderProductOptions(selectedCategory) {
  elements.productSelect.innerHTML = '<option disabled selected>Pilih produk...</option>';
  productsCache
    .filter(p => !selectedCategory || p.category === selectedCategory)
    .forEach(p => {
      const opt = new Option(p.name, p.id);
      opt.dataset.price = p.price;
      opt.dataset.category = p.category;
      elements.productSelect.add(opt);
    });

  elements.productSelect.onchange = () => {
    const opt = elements.productSelect.selectedOptions[0];
    const price = parseInt(opt.dataset.price);
    const category = opt.dataset.category;

    elements.totalPrice.textContent = price ? `Total: Rp ${price}` : '';
    elements.quantityBox.classList.toggle('hidden', category !== 'Joki MLBB');
  };
}

// Order Form Submit
elements.orderForm.onsubmit = async e => {
  e.preventDefault();

  const opt = elements.productSelect.selectedOptions[0];
  const product_id = opt?.value;
  const product_name = opt?.text;
  const price = parseInt(opt.dataset.price);
  const category = opt.dataset.category;
  const quantity = elements.quantityInput?.value ? parseInt(elements.quantityInput.value) : 1;

  const game_id = elements.gameId.value.trim();
  const server_id = elements.serverId.value.trim();
  const buyer_name = elements.buyerName.value.trim();
  const payment_method = elements.paymentMethod.value;
  const secret = elements.secret.value.trim();

  if (!product_id || !buyer_name || !game_id || !payment_method || isNaN(quantity)) {
    return alert('Lengkapi semua data dengan benar.');
  }

  if (payment_method === 'cash') {
    const { data } = await supabase.from('secrets').select('*');
    const valid = data.some(s => s.code === secret);
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

  if (error) return alert('Gagal simpan pesanan: ' + error.message);

  alert('Pemesanan berhasil!');

  if (category === 'Joki MLBB' || payment_method === 'transfer') {
    const info = category === 'Topup ML' ? `Server ID: ${server_id}` : `ID: ${game_id}`;
    const text = `Halo Admin, saya ${buyer_name} ingin memesan ${quantity}x ${product_name} untuk ${info}`;
    window.open(`https://wa.me/6281335761181?text=${encodeURIComponent(text)}`, '_blank');
  }

  elements.orderForm.reset();
  elements.totalPrice.textContent = '';
  elements.quantityBox.classList.add('hidden');
};

// Admin Products
elements.addProductBtn.onclick = async () => {
  const name = elements.newName.value.trim();
  const price = parseInt(elements.newPrice.value);
  const category = elements.newCategory.value;
  if (!name || !price || !category) return alert('Isi semua data produk');

  const { error } = await supabase.from('products').insert([{ name, price, category, show: true }]);
  if (error) return alert('Gagal tambah: ' + error.message);

  elements.newName.value = '';
  elements.newPrice.value = '';
};

function renderAdminList() {
  elements.adminProducts.innerHTML = '';
  productsCache.forEach(p => {
    const row = document.createElement('div');
    row.className = 'admin-item';
    row.innerHTML = `
      ${p.category} — <strong>${p.name}</strong> — Rp ${p.price}
      <button data-id="${p.id}" class="del">Hapus</button>
      <button data-id="${p.id}" class="toggle">${p.show === false ? 'Tampilkan' : 'Sembunyikan'}</button>
    `;
    elements.adminProducts.appendChild(row);
  });

  elements.adminProducts.querySelectorAll('.del').forEach(btn => {
    btn.onclick = async () => {
      await supabase.from('products').delete().eq('id', btn.dataset.id);
    };
  });

  elements.adminProducts.querySelectorAll('.toggle').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const prod = productsCache.find(p => p.id == id);
      await supabase.from('products').update({ show: !prod.show }).eq('id', id);
    };
  });
}

// Load Orders
async function loadOrders() {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (error) return console.error(error);
  elements.ordersCash.innerHTML = '';
  elements.ordersTrans.innerHTML = '';
  data.forEach(o => {
    const li = document.createElement('li');
    const info = o.category === 'Topup ML' ? `Server ID: ${o.server_id}` : `ID: ${o.game_id}`;
    li.textContent = `${new Date(o.created_at).toLocaleString()} — ${info} — ${o.product_name}`;
    if (o.payment_method === 'cash') elements.ordersCash.appendChild(li);
    else elements.ordersTrans.appendChild(li);
  });
}

// Real-time Sync
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

loadProducts();

