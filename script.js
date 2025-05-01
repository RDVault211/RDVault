// KONFIGURASI SUPABASE
const SUPABASE_URL = 'https://uegbyvcdwxnbdohvtmqi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZ2J5dmNkd3huYmRvaHZ0bXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNjgyMjYsImV4cCI6MjA2MTY0NDIyNn0.o8-Qi4mRQmZBGgVq0Aw7d2dB0qqO9uQBZfZCRuxmUys';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ELEMENTS
const productList = document.getElementById('product-list');
const categorySelect = document.getElementById('category-select');
const orderForm = document.getElementById('order-form');
const productSelect = document.getElementById('product-select');
const serverIdInput = document.getElementById('server-id');
const totalDisplay = document.getElementById('total-harga');
const paymentMethodInput = document.getElementById('payment-method');

let allProducts = [];

// TAMPILKAN PRODUK BERDASARKAN KATEGORI
async function fetchProducts() {
  const { data, error } = await client.from('products').select('*').order('created_at');
  if (error) return alert('Gagal ambil produk');

  allProducts = data;
  filterProductsByCategory(categorySelect.value);
}

function filterProductsByCategory(category) {
  productSelect.innerHTML = '<option value="">-- Pilih Produk --</option>';
  const filtered = allProducts.filter(p => p.category === category);
  filtered.forEach(p => {
    const option = document.createElement('option');
    option.value = p.name;
    option.textContent = `${p.name} - Rp${p.price.toLocaleString()}`;
    option.dataset.price = p.price;
    productSelect.appendChild(option);
  });
}

// REALTIME SYNC PRODUK
client.channel('realtime:products')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
  .subscribe();

// GANTI PRODUK SAAT KATEGORI DIPILIH
categorySelect.addEventListener('change', () => {
  const category = categorySelect.value;
  filterProductsByCategory(category);
  serverIdInput.style.display = category === 'Topup ML' ? 'block' : 'none';
});

// TAMPILKAN TOTAL HARGA SAAT PRODUK DIPILIH
productSelect.addEventListener('change', () => {
  const selected = productSelect.options[productSelect.selectedIndex];
  const price = selected.dataset.price;
  totalDisplay.textContent = price ? `Rp${parseInt(price).toLocaleString()}` : '';
});

// KIRIM FORM PEMESANAN
orderForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const category = categorySelect.value;
  const product_name = productSelect.value;
  const buyer_name = document.getElementById('buyer-name').value.trim();
  const game_id = document.getElementById('game-id').value.trim();
  const server_id = category === 'Topup ML' ? serverIdInput.value.trim() : '';
  const payment_method = paymentMethodInput.value;

  if (!category || !product_name || !buyer_name || !game_id || (category === 'Topup ML' && !server_id)) {
    return alert('Lengkapi semua form!');
  }

  const { error } = await client.from('orders').insert([{
    category, product_name, buyer_name, game_id, server_id, payment_method
  }]);

  if (error) {
    alert('Gagal mengirim pesanan');
  } else {
    alert('Pesanan berhasil!');
    orderForm.reset();
    totalDisplay.textContent = '';
    if (payment_method === 'transfer') {
      window.location.href = 'https://wa.me/6281335761181?text=Halo%20saya%20sudah%20melakukan%20transfer%20untuk%20topup.';
    }
  }
});
