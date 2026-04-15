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
    int fee;
    cin >> fee;
    long long cash = 0, hold = -prices[0];
    for (int i = 1; i < n; i++) {
        long long prevCash = cash;
        cash = max(cash, hold + prices[i] - fee);
        hold = max(hold, prevCash - (long long)prices[i]);
    }
    cout << cash << "\n";
    return 0;
}
