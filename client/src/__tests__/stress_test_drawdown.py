# stress_test_drawdown.py
"""
Simulate rapid market moves and test risk enforcement for drawdown limits.
"""
import requests
import time

API_URL = 'http://localhost:3000/api/portfolios/{portfolio_id}/risk/assessment'

# Simulate a series of equity drops
portfolio_id = 'YOUR_PORTFOLIO_ID'
for i in range(10):
    # Simulate a drawdown event (replace with actual API or DB update in real test)
    # Here, just call the risk assessment endpoint
    resp = requests.get(API_URL.format(portfolio_id=portfolio_id))
    print(f'Assessment {i+1}:', resp.json())
    time.sleep(0.5)

# In a real test, you would also POST fake trades or update equity to trigger drawdown
