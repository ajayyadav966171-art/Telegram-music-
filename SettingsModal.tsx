const handleVerifyPhoneCode = async () => {
  try {
    const res = await fetch('/api/telegram/mtproto/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone,
        code: phoneCode,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Invalid verification code');
      return;
    }

    alert('MTProto Login verified! Session active.');
  } catch (err) {
    console.error(err);
    alert('Verification failed');
  }
};
