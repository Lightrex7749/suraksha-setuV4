import httpx, json

client = httpx.Client(base_url='http://localhost:8000', timeout=10)

# 1. Register phone
r = client.post('/api/users/register-phone', json={
    'uid': 'test123', 'phone': '+919876543210', 'email': 'test@test.com', 'name': 'Test User'
})
print(f'Register phone: {r.status_code} → {r.json()}')

# 2. Phone count
r = client.get('/api/users/phone-count')
print(f'Phone count: {r.status_code} → {r.json()}')

# 3. SMS status
r = client.get('/api/sms/status')
print(f'SMS status: {r.status_code} → {r.json()}')

# 4. SMS audit log
r = client.get('/api/sms/audit-log')
print(f'SMS audit: {r.status_code} → {r.json()}')

# 5. Safety status
r = client.get('/admin/safety/status')
print(f'Safety: {r.status_code} → {r.json()}')

# 6. Pending alerts
r = client.get('/admin/alerts/pending')
print(f'Pending: {r.status_code} → {r.json()}')
