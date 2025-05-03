import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ── Inisialisasi Supabase ────────────────────────
const supabase = createClient(
  'https://roiwwquzsyiwzifjvagc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…CFbwCDkeA'
);

// ── Helper ───────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Buyer Elements ───────────────────────────────
const btnToggle    = $('toggle-products');
const listProduk   = $('produk-list');
const formOrder    = $('order-form');
const selKategori  = $('order-category');
const selProduk    = $('product');
const inpQty       = $('quantity-group');
const inpServer    = $('server_id');
const lblServer    = $('label-server');
const inpGame      = $('id_game');
const inpBuyer     = $('buyer_name');
const selMethod    = $('payment_method');
const inpSecret    = $('secret');
const totalDisplay = $('total-price');

// ── Admin Elements ───────────────────────────────
const formLogin    = $('login-form');
const panelAdmin   = $('admin-panel');
const formAdd      = $('add-form');
const listAdmin    = $('admin-produk-list');
const logoutBtn    = $('logout-btn');

// ── State ────────────────────────────────────────
let productsCache = [];

// ── Inisialisasi ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadProduk();
  bindToggle();
  bindCategory();
  bindAuth();
});

// ── Toggle Produk ────────────────────────────────
function bindToggle() {
  btnToggle?.addEventListener('click', () => {
    listProduk.classList.toggle('hidden');
  });
}

// ── Load & Render Produk ─────────────────────────
async function loadProduk() {
  const { data, error } = await supabase.from('products').select('*').order('category');
  if (error) return console.error(error);
  productsCache = data;
  renderProdukList(data);
  renderProdukSelect(data);
}

// Render grid buyer
function renderProdukList(list) {
  listProduk.innerHTML = '';
  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'p-4 bg-gray-800 rounded shadow';
    card.innerHTML = `<h3 class="font-bold">${p.name}</h3>
                      <p>Rp ${p.price.toLocaleString()}</p>`;
    listProduk.append(card);
  });
  listProduk.classList.remove('hidden');
}

// Render dropdown buyer
function renderProdukSelect(list) {
  selProduk.innerHTML = '<option disabled selected>Pilih produk...</option>';
  list.forEach(p => {
    const opt = new Option(`${p.name} - Rp${p.price}`, p.id);
    opt.dataset.price = p.price;
    selProduk.add(opt);
  });
  selProduk.onchange = updateTotal;
  inpQty.querySelector('input')?.addEventListener('input', updateTotal);
}

function updateTotal() {
  const price = parseInt(selProduk.selectedOptions[0]?.dataset.price || '0');
  const qty   = parseInt(inpQty.querySelector('input')?.value || '1');
  const total = price * qty;
  totalDisplay.textContent = total ? `Total: Rp ${total.toLocaleString()}` : '';
}

// ── Kategori & Dynamic Fields ────────────────────
function bindCategory() {
  selKategori.onchange = () => {
    const sel = selKategori.value;
    const filtered = productsCache.filter(p => p.category === sel);
    renderProdukList(filtered);
    renderProdukSelect(filtered);

    // Server ID untuk ML & PUBGM
    const showSrv = sel === 'Topup ML' || sel === 'Topup PUBGM';
    lblServer.classList.toggle('hidden', !showSrv);
    inpServer.classList.toggle('hidden', !showSrv);

    // Quantity hanya untuk Joki MLBB
    const showQty = sel === 'Joki MLBB';
    inpQty.classList.toggle('hidden', !showQty);
  };

  // Payment method toggle secret field
  selMethod.onchange = () => {
    inpSecret.classList.toggle('hidden', selMethod.value !== 'cash');
  };
}

// ── Order Submit ─────────────────────────────────
formOrder?.addEventListener('submit', async e => {
  e.preventDefault();
  const prodOpt       = selProduk.selectedOptions[0];
  const category      = selKategori.value;
  const priceUnit     = parseInt(prodOpt?.dataset.price || '0');
  const qty           = parseInt(inpQty.querySelector('input')?.value || '1');
  const totalPrice    = priceUnit * qty;
  const payload = {
    product_id:     prodOpt.value,
    product_name:   prodOpt.text,
    price:          totalPrice,
    quantity:       qty,
    game_id:        inpGame.value.trim(),
    server_id:      inpServer.value.trim(),
    buyer_name:     inpBuyer.value.trim(),
    payment_method: selMethod.value,
    category
  };

  // validasi secret untuk cash
  if (selMethod.value === 'cash') {
    const { data } = await supabase.from('secrets').select('*').eq('code', inpSecret.value.trim());
    if (!data.length) return alert('Kode rahasia salah.');
  }

  const { error } = await supabase.from('orders').insert([payload]);
  if (error) return alert('Gagal menyimpan pesanan: ' + error.message);
  alert('Pesanan berhasil!');

  if (category === 'Joki MLBB' || selMethod.value === 'transfer') {
    const info = category === 'Topup ML' || category === 'Topup PUBGM'
      ? `Server ID: ${payload.server_id}`
      : `ID: ${payload.game_id}`;
    const text = `Halo Admin, saya ${payload.buyer_name} pesan ${payload.quantity}× ${payload.product_name} (${info})`;
    window.open(`https://wa.me/6281335761181?text=${encodeURIComponent(text)}`, '_blank');
  }

  formOrder.reset();
  totalDisplay.textContent = '';
});

// ── Authentication & Admin Panel ─────────────────
function bindAuth() {
  // onAuthChange
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      formLogin.classList.add('hidden');
      panelAdmin.classList.remove('hidden');
      loadAdminData();
    } else {
      formLogin.classList.remove('hidden');
      panelAdmin.classList.add('hidden');
    }
  });

  // Login form
  formLogin?.addEventListener('submit', async e => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email:    $('email').value,
      password: $('password').value
    });
    if (error) alert('Login gagal: ' + error.message);
  });

  // Logout
  logoutBtn?.addEventListener('click', async () => {
    await supabase.auth.signOut();
  });
}

// ── Load & Render Admin Data ─────────────────────
async function loadAdminData() {
  // Produk Admin
  const { data: prods } = await supabase.from('products').select('*');
  listAdmin.innerHTML = '';
  prods.forEach(p => {
    const row = document.createElement('div');
    row.className = 'flex justify-between bg-gray-800 p-2 rounded mb-2';
    row.innerHTML = `
      <span>${p.name} - Rp${p.price} (${p.category})</span>
      <button class="bg-red-500 px-2" onclick="hapusProduk('${p.id}')">Hapus</button>
    `;
    listAdmin.appendChild(row);
  });

  // Pesanan Admin (opsional, bisa ditambah di lain section)
}

// Hapus produk (global fungsi)
window.hapusProduk = async id => {
  await supabase.from('products').delete().eq('id', id);
  loadAdminData();
  loadProduk();
};
