#include <iostream>
#include <vector>
#include <map>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int m, n;
    if (!(cin >> m >> n)) return 0;
    vector<vector<int>> grid(m, vector<int>(n));
    for (int i = 0; i < m; i++)
        for (int j = 0; j < n; j++)
            cin >> grid[i][j];
    map<vector<int>, int> freq;
    for (int i = 0; i < m; i++) {
        vector<int> key(n);
        for (int j = 0; j < n; j++)
            key[j] = grid[i][j] ^ grid[i][0];
        freq[key]++;
    }
    int ans = 0;
    for (auto& [k, v] : freq) ans = max(ans, v);
    cout << ans << "\n";
    return 0;
}
