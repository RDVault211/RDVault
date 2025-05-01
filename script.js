const supabase = supabase.createClient(
  'https://uegbyvcdwxnbdohvtmqi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZ2J5dmNkd3huYmRvaHZ0bXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNjgyMjYsImV4cCI6MjA2MTY0NDIyNn0.o8-Qi4mRQmZBGgVq0Aw7d2dB0qqO9uQBZfZCRuxmUys'
);

// Handle Pembeli
document.getElementById('order-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const category = document.getElementById('category').value;
  const productName = document.getElementById('product').value;
  const buyerName = document.getElementById('buyer').value;
  const gameId = document.getElementById('game-id').value;
  const serverId = document.getElementById('server-id').value;
  const paymentMethod = document.getElementById('payment').value;

  const { data, error } = await supabase.from('orders').insert([{
    category,
    product_name: productName,
    buyer_name: buyerName,
    game_id: gameId,
    server_id: serverId,
    payment_method: paymentMethod
  }]);

  if (error) {
    alert('Pesanan gagal: ' + error.message);
    return;
  }

  alert('Pesanan berhasil dikirim! Cek status di panel admin.');
});

// Handle Admin
supabase.from('orders').on('INSERT', (payload) => {
  console.log('Pesanan baru:', payload.new);
  const tableBody = document.querySelector('#orders-list tbody');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${payload.new.buyer_name}</td>
    <td>${payload.new.product_name}</td>
    <td>${payload.new.category}</td>
    <td>Menunggu Pembayaran</td>
  `;
  tableBody.appendChild(row);
});

// Load Produk untuk Pembeli
async function loadProducts() {
  const { data, error } = await supabase.from('products').select('*');
  if (error) {
    console.error(error);
    return;
  }

  const productSelect = document.getElementById('product');
  data.forEach(product => {
    const option = document.createElement('option');
    option.value = product.name;
    option.textContent = product.name;
    productSelect.appendChild(option);
  });
}

loadProducts();

