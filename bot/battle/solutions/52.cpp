#include <iostream>
#include <vector>
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
    for (int i = 0; i < m; i++)
        sort(grid[i].begin(), grid[i].end());
    int ans = 0;
    for (int j = 0; j < n; j++) {
        int mx = 0;
        for (int i = 0; i < m; i++)
            mx = max(mx, grid[i][j]);
        ans += mx;
    }
    cout << ans << "\n";
    return 0;
}
