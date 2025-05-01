import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  'https://uegbyvcdwxnbdohvtmqi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZ2J5dmNkd3huYmRvaHZ0bXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNjgyMjYsImV4cCI6MjA2MTY0NDIyNn0.o8-Qi4mRQmZBGgVq0Aw7d2dB0qqO9uQBZfZCRuxmUys'
);

const loginBtn = document.getElementById('login-btn'),
      logoutBtn = document.getElementById('logout-btn'),
      logout2Btn = document.getElementById('logout2-btn'),
      authSection = document.getElementById('auth-section'),
      adminPanel = document.getElementById('admin-panel'),
      productList = document.getElementById('product-list'),
      categoryFilter = document.getElementById('category-filter'),
      orderCategory = document.getElementById('order-category'),
      productSelect = document.getElementById('product'),
      totalPriceEl = document.getElementById('total-price'),
      orderForm = document.getElementById('order-form');

loginBtn.onclick = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: document.getElementById('email').value,
    password: document.getElementById('password').value
  });
  if (error) return alert('Login gagal: ' + error.message);
  authSection.classList.add('hidden');
  adminPanel.classList.remove('hidden');
  fetchProducts();
  fetchOrders();
};
logoutBtn.onclick = logout2Btn.onclick = () => location.reload();

async function fetchProducts() {
  const { data: products } = await supabase.from('products').select('*').order('category');
  renderCategories(products);
}
supabase.channel('products')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
  .subscribe();

function renderCategories(products) {
  const cats = [...new Set(products.map(p => p.category))];
  categoryFilter.innerHTML = '<option value="all">Semua</option>';
  orderCategory.innerHTML = '<option value="" disabled selected>Pilih kategori...</option>';
  cats.forEach(c => {
    categoryFilter.append(new Option(c, c));
    orderCategory.append(new Option(c, c));
  });
  categoryFilter.onchange = () => renderProductList(products.filter(p => categoryFilter.value === 'all' || p.category === categoryFilter.value));
  orderCategory.onchange = () => {
    const selectedCat = orderCategory.value;
    const filtered = products.filter(p => p.category === selectedCat);
    renderProductList(filtered);
    renderProductSelect(filtered);
    if (selectedCat === 'Topup ML') {
      document.getElementById('label-server').classList.remove('hidden');
      document.getElementById('server_id').classList.remove('hidden');
    } else {
      document.getElementById('label-server').classList.add('hidden');
      document.getElementById('server_id').classList.add('hidden');
    }
  };
}

function renderProductList(products) {
  productList.innerHTML = '';
  products.forEach(p => {
    const div = document.createElement('div');
    div.className = 'product-item';
    div.innerHTML = `<strong>${p.name}</strong><br>Rp ${p.price}<br><em>${p.category}</em>`;
    productList.appendChild(div);
  });
}

function renderProductSelect(products) {
  productSelect.innerHTML = '<option value="" disabled selected>Pilih produk...</option>';
  products.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.text = p.name;
    opt.dataset.price = p.price;
    productSelect.append(opt);
  });
  productSelect.onchange = () => {
    const price = productSelect.selectedOptions[0].dataset.price;
    totalPriceEl.textContent = `Total: Rp ${price}`;
  };
}

orderForm.onsubmit = async e => {
  e.preventDefault();
  const prodOpt = productSelect.selectedOptions[0];
  const price = prodOpt.dataset.price;
  const paymentMethod = document.getElementById('payment_method').value;
  const idGame = document.getElementById('id_game').value;
  const serverId = document.getElementById('server_id').value || '';
  const buyerName = document.getElementById('buyer_name').value;
  const secret = document.getElementById('secret').value;
  const { data: setting } = await supabase.from('settings').select('value').eq('key', 'secret').single();
  if (paymentMethod === 'cash') {
    if (secret !== setting.value) return alert('Kode rahasia salah!');
    await supabase.from('orders').insert([{ category: orderCategory.value, product_name: prodOpt.text, buyer_name: buyerName, game_id: idGame, server_id: serverId, payment_method: paymentMethod }]);
    alert(`Pesanan berhasil! Total: Rp ${price}`);
  } else {
    window.location.href = `https://wa.me/6281335761181?text=${encodeURIComponent(`Halo, saya mau top-up. Produk: ${prodOpt.text}, Total: Rp ${price}, GameID/ServerID: ${serverId || idGame}`)}`;
  }
};

// Admin order fetch omitted for brevity

