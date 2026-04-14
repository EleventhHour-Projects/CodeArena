#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    if (n == 0) {
        cout << 0 << "\n";
        return 0;
    }
    int min_price = 1e9, max_profit = 0;
    for (int i = 0; i < n; i++) {
        int price;
        cin >> price;
        min_price = min(min_price, price);
        max_profit = max(max_profit, price - min_price);
    }
    cout << max_profit << "\n";
    return 0;
}
