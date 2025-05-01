const supabaseUrl = 'https://uegbyvcdwxnbdohvtmqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZ2J5dmNkd3huYmRvaHZ0bXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNjgyMjYsImV4cCI6MjA2MTY0NDIyNn0.o8-Qi4mRQmZBGgVq0Aw7d2dB0qqO9uQBZfZCRuxmUys'; // Ganti dengan key kamu
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Ambil elemen DOM
const categorySelect = document.getElementById('category');
const productSelect = document.getElementById('product');
const nameInput = document.getElementById('buyerName');
const idInput = document.getElementById('gameId');
const serverInput = document.getElementById('serverId');
const methodSelect = document.getElementById('paymentMethod');
const orderButton = document.getElementById('submitOrder');
const totalDisplay = document.getElementById('totalPrice');

// Inisialisasi
let allProducts = [];

function showServerId(show) {
  document.getElementById('serverIdGroup').style.display = show ? 'block' : 'none';
}

async function fetchProducts() {
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: true });
  if (data) {
    allProducts = data;
    populateCategories();
  }
}

function populateCategories() {
  const categories = [...new Set(allProducts.map(p => p.category))];
  categorySelect.innerHTML = `<option value="">Pilih Kategori</option>` +
    categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

categorySelect.addEventListener('change', () => {
  const selected = categorySelect.value;
  const filtered = allProducts.filter(p => p.category === selected);
  productSelect.innerHTML = `<option value="">Pilih Produk</option>` +
    filtered.map(p => `<option value="${p.name}" data-price="${p.price}">${p.name} - Rp${p.price.toLocaleString()}</option>`).join('');
  showServerId(selected === 'Topup ML');
});

productSelect.addEventListener('change', () => {
  const selectedOption = productSelect.selectedOptions[0];
  const price = selectedOption ? selectedOption.getAttribute('data-price') : 0;
  totalDisplay.textContent = price ? `Total: Rp${parseInt(price).toLocaleString()}` : '';
});

orderButton.addEventListener('click', async () => {
  const name = nameInput.value.trim();
  const id = idInput.value.trim();
  const server = serverInput.value.trim();
  const category = categorySelect.value;
  const productOption = productSelect.selectedOptions[0];
  const payment = methodSelect.value;

  if (!name || !id || !category || !productOption || !payment) {
    alert('Mohon lengkapi semua data.');
    return;
  }

  const productName = productOption.value;

  // Kirim ke Supabase
  const { error } = await supabase.from('orders').insert([
    {
      category,
      product_name: productName,
      buyer_name: name,
      game_id: id,
      server_id: category === 'Topup ML' ? server : '',
      payment_method: payment,
    }
  ]);

  if (error) {
    alert('Gagal memesan.');
    return;
  }

  alert('Pesanan berhasil dikirim!');

  // Jika metode Transfer, arahkan ke WhatsApp
  if (payment === 'Transfer') {
    const waMsg = `Halo, saya ingin konfirmasi pesanan:\nNama: ${name}\nID: ${id}${category === 'Topup ML' ? `\nServer ID: ${server}` : ''}\nProduk: ${productName}\nKategori: ${category}\nMetode: Transfer`;
    window.open(`https://wa.me/6281335761181?text=${encodeURIComponent(waMsg)}`, '_blank');
  }

  nameInput.value = '';
  idInput.value = '';
  serverInput.value = '';
  productSelect.innerHTML = '';
  categorySelect.value = '';
  totalDisplay.textContent = '';
});

fetchProducts();
