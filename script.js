const supabase = supabase.createClient('https://uegbyvcdwxnbdohvtmqi.supabase.co', 'YOUR_PUBLIC_ANON_KEY');

document.getElementById('order-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const category = document.getElementById('category-select').value;
  const productName = document.getElementById('product-select').value;
  const buyerName = document.getElementById('buyer-name').value;
  const gameId = document.getElementById('game-id').value;
  const serverId = category === 'Topup ML' ? document.getElementById('server-id').value : null;
  const paymentMethod = document.getElementById('payment-method').value;

  const { data, error } = await supabase.from('orders').insert([{
    category,
    product_name: productName,
    buyer_name: buyerName,
    game_id: gameId,
    server_id: serverId,
    payment_method: paymentMethod
  }]);

  if (error) {
    alert('Gagal mengirim pesanan: ' + error.message);
    return;
  }

  alert('Pesanan berhasil dikirim!');
});

