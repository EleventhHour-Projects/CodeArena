#include <iostream>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int m, n;
    if (!(cin >> m >> n)) return 0;
    int maxWealth = 0;
    for (int i = 0; i < m; i++) {
        int sum = 0;
        for (int j = 0; j < n; j++) {
            int x; cin >> x;
            sum += x;
        }
        maxWealth = max(maxWealth, sum);
    }
    cout << maxWealth << "\n";
    return 0;
}
