#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> prices(n);
    for (int i = 0; i < n; i++) cin >> prices[i];
    int money;
    cin >> money;
    sort(prices.begin(), prices.end());
    int cost = prices[0] + prices[1];
    if (cost <= money) cout << money - cost << "\n";
    else cout << money << "\n";
    return 0;
}
