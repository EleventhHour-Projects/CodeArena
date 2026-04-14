#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int m, n;
    if (!(cin >> m >> n)) return 0;
    for (int i = 0; i < n; i++) {
        vector<int> row(n);
        for (int j = 0; j < n; j++) cin >> row[j];
        reverse(row.begin(), row.end());
        for (int j = 0; j < n; j++) {
            cout << (row[j] ^ 1) << (j == n - 1 ? "" : " ");
        }
        cout << "\n";
    }
    return 0;
}
