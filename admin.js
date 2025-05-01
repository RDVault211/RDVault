const supabaseUrl = 'https://uegbyvcdwxnbdohvtmqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZ2J5dmNkd3huYmRvaHZ0bXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNjgyMjYsImV4cCI6MjA2MTY0NDIyNn0.o8-Qi4mRQmZBGgVq0Aw7d2dB0qqO9uQBZfZCRuxmUys'; // Ganti jika perlu
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

const categoryInput = document.getElementById('category');
const nameInput = document.getElementById('name');
const priceInput = document.getElementById('price');
const addProductBtn = document.getElementById('addProduct');
const productList = document.getElementById('productList');
const orderListCash = document.getElementById('orderListCash');
const orderListTransfer = document.getElementById('orderListTransfer');

async function loadProducts() {
  const { data } = await supabase.from('products').select('*').order('created_at', { ascending: true });
  if (data) {
    productList.innerHTML = '';
    data.forEach(p => {
      const item = document.createElement('div');
      item.textContent = `${p.category} - ${p.name} (Rp${p.price.toLocaleString()})`;
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Hapus';
      delBtn.onclick = async () => {
        await supabase.from('products').delete().eq('id', p.id);
        loadProducts();
      };
      item.appendChild(delBtn);
      productList.appendChild(item);
    });
  }
}

async function loadOrders() {
  const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (data) {
    orderListCash.innerHTML = '';
    orderListTransfer.innerHTML = '';
    data.forEach(o => {
      const item = document.createElement('li');
      item.textContent = `${o.buyer_name} | ${o.product_name} | ${o.category} | ${o.payment_method}`;
      if (o.payment_method === 'Cash') {
        orderListCash.appendChild(item);
      } else {
        orderListTransfer.appendChild(item);
      }
    });
  }
}

addProductBtn.addEventListener('click', async () => {
  const category = categoryInput.value.trim();
  const name = nameInput.value.trim();
  const price = parseInt(priceInput.value);
  if (!category || !name || isNaN(price)) {
    alert('Isi semua kolom');
    return;
  }
  await supabase.from('products').insert([{ category, name, price }]);
  categoryInput.value = '';
  nameInput.value = '';
  priceInput.value = '';
  loadProducts();
});

loadProducts();
loadOrders();
