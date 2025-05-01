import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://uegbyvcdwxnbdohvtmqi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZ2J5dmNkd3huYmRvaHZ0bXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNjgyMjYsImV4cCI6MjA2MTY0NDIyNn0.o8-Qi4mRQmZBGgVq0Aw7d2dB0qqO9uQBZfZCRuxmUys';
const supabase     = createClient(SUPABASE_URL, SUPABASE_KEY);

// State
let productsCache = [];

// DOM
const categoryFilter = document.getElementById('category-filter');
const orderCategory  = document.getElementById('order-category');
const productList    = document.getElementById('product-list');
const productSelect  = document.getElementById('product');
const totalPriceEl   = document.getElementById('total-price');
const orderForm      = document.getElementById('order-form');
const idInput        = document.getElementById('id_game');
const serverInput    = document.getElementById('server_id');
const buyerInput     = document.getElementById('buyer_name');
const payMethodSelect= document.getElementById('payment_method');
const labelServer    = document.getElementById('label-server');

// Load Products
async function loadProducts() {
  const { data, error } = await supabase.from('products').select('*').order('category');
  if (error) return console.error('Load products error:', error);
  productsCache = data;
  renderCategoryFilters();
  renderProductList(data);
  renderProductSelect(data);
}

// Render
function renderCategoryFilters() {
  const cats = [...new Set(productsCache.map(p => p.category))];
  categoryFilter.innerHTML = '';
  orderCategory.innerHTML = '<option disabled selected>Pilih kategori</option>';
  cats.forEach(cat => {
    categoryFilter.add(new Option(cat, cat));
    orderCategory.add(new Option(cat, cat));
  });
}

function renderProductList(list) {
  productList.innerHTML = '';
  list.forEach(p => {
    const div = document.createElement('div');
    div.className = 'product-item';
    div.innerHTML = `<strong>${p.name}</strong><br>Rp ${p.price}<br><em>${p.category}</em>`;
    productList.appendChild(div);
  });
}

function renderProductSelect(list) {
  productSelect.innerHTML = '<option disabled selected>Pilih produk</option>';
  list.forEach(p => {
    const opt = new Option(p.name, p.id);
    opt.dataset.price = p.price;
    productSelect.add(opt);
  });
  productSelect.onchange = () => {
    const price = productSelect.selectedOptions[0]?.dataset.price || 0;
    totalPriceEl.textContent = `Total: Rp ${price}`;
  };
}

// Filter on change
orderCategory.onchange = () => {
  const cat = orderCategory.value;
  const filtered = productsCache.filter(p => p.category === cat);
  renderProductList(filtered);
  renderProductSelect(filtered);
  const showServer = cat === 'Topup ML';
  labelServer.classList.toggle('hidden', !showServer);
  serverInput.classList.toggle('hidden', !showServer);
};

// Form Submit
orderForm.onsubmit = async e => {
  e.preventDefault();
  const productId = productSelect.value;
  const product = productsCache.find(p => p.id === productId);
  if (!product) return alert('Pilih produk dulu.');

  const payload = {
    category: product.category,
    product_name: product.name,
    buyer_name: buyerInput.value,
    game_id: idInput.value,
    server_id: product.category === 'Topup ML' ? serverInput.value : null,
    payment_method: payMethodSelect.value,
  };

  const { error } = await supabase.from('orders').insert([payload]);
  if (error) return alert('Gagal memesan: ' + error.message);

  if (payload.payment_method === 'transfer') {
    const waText = encodeURIComponent(
      `Halo, saya mau order:\nNama: ${payload.buyer_name}\nProduk: ${payload.product_name}\nID: ${payload.game_id}${payload.server_id ? ' ('+payload.server_id+')' : ''}`
    );
    location.href = `https://wa.me/6281335761181?text=${waText}`;
  } else {
    alert('Pesanan berhasil!');
  }

  orderForm.reset();
  totalPriceEl.textContent = '';
  serverInput.classList.add('hidden');
  labelServer.classList.add('hidden');
};

// Realtime
function subscribeProductChanges() {
  supabase
    .channel('realtime:products')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, loadProducts)
    .subscribe();
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  subscribeProductChanges();
});
