import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://roiwwquzsyiwzifjvagc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaXd3cXV6c3lpd3ppZmp2YWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNDI1MDksImV4cCI6MjA2MTgxODUwOX0.r55cFBttjq259Sved86qScdouQbCFUDeIJCFbwCDkeA'
);

const $ = (id) => document.getElementById(id);

async function loadProducts() {
  const { data, error } = await supabase.from('products').select('*');
  if (error) return alert('Gagal memuat produk');

  const productSelect = $('product');
  const categorySelect = $('order-category');
  const categories = [...new Set(data.map((p) => p.category))];

  categorySelect.innerHTML = '<option disabled selected>Pilih kategori</option>';
  categories.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    categorySelect.appendChild(opt);
  });

  categorySelect.onchange = () => {
    productSelect.innerHTML = '';
    const filtered = data.filter((p) => p.category === categorySelect.value);
    filtered.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} - Rp${p.price}`;
      opt.dataset.price = p.price;
      productSelect.appendChild(opt);
    });
  };

  $('quantity').oninput = updateTotal;
  productSelect.onchange = updateTotal;
}

function updateTotal() {
  const selected = $('product').selectedOptions[0];
  const qty = parseInt($('quantity').value || '1');
  if (!selected) return;
  const price = parseInt(selected.dataset.price);
  $('total-price').textContent = `Total: Rp ${price * qty}`;
}

$('payment_method').onchange = () => {
  $('secret').classList.toggle('hidden', $('payment_method').value !== 'cash');
};

$('order-form').onsubmit = async (e) => {
  e.preventDefault();

  const method = $('payment_method').value;
  if (method === 'cash') {
    const { data } = await supabase.from('secrets').select('*').eq('code', $('secret').value);
    if (data.length === 0) return alert('Kode rahasia salah');
  }

  const { error } = await supabase.from('orders').insert({
    product_id: $('product').value,
    buyer_name: $('buyer_name').value,
    quantity: $('quantity').value,
    total_price: parseInt($('product').selectedOptions[0].dataset.price) * parseInt($('quantity').value),
    method,
    id_game: $('id_game').value,
    server_id: $('server_id').value
  });

  if (error) return alert('Gagal memesan');

  if (method === 'transfer') {
    const msg = encodeURIComponent(`Halo, saya ingin melakukan pembayaran top-up untuk ID ${$('id_game').value}`);
    window.open(`https://wa.me/6281335761181?text=${msg}`);
  }

  alert('Pesanan berhasil');
  location.reload();
};

$('login-btn').onclick = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: $('email').value,
    password: $('password').value
  });
  if (error) alert('Login gagal');
};

supabase.auth.onAuthStateChange(async (_, session) => {
  if (session) {
    $('auth-section').classList.add('hidden');
    $('admin-panel').classList.remove('hidden');
    loadAdminData();
  }
});

$('logout-btn').onclick = async () => {
  await supabase.auth.signOut();
  location.reload();
};

async function loadAdminData() {
  const { data: products } = await supabase.from('products').select('*');
  const list = $('admin-products');
  list.innerHTML = '';
  products.forEach((p) => {
    const div = document.createElement('div');
    div.textContent = `${p.name} - Rp${p.price} (${p.category})`;
    list.appendChild(div);
  });

  const { data: orders } = await supabase.from('orders').select('*');
  const cash = $('orders-cash');
  const tf = $('orders-transfer');
  orders.forEach((o) => {
    const li = document.createElement('li');
    li.textContent = `${o.buyer_name} - ${o.method} - Rp${o.total_price}`;
    (o.method === 'cash' ? cash : tf).appendChild(li);
  });
}

$('add-product-btn').onclick = async () => {
  const name = $('new-name').value;
  const price = parseInt($('new-price').value);
  const category = $('new-category').value;
  if (!name || !price || !category) return;
  await supabase.from('products').insert({ name, price, category });
  loadAdminData();
};

loadProducts();
