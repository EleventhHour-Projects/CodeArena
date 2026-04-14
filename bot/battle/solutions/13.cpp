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
        for (int j = 0; j < n; j++) cin >> grid[i][j];
    int x, y, k;
    if (!(cin >> x >> y >> k)) return 0;
    for (int i = 0; i < k / 2; i++) {
        for (int j = 0; j < k; j++) {
            swap(grid[x + i][y + j], grid[x + k - 1 - i][y + j]);
        }
    }
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            cout << grid[i][j] << (j == n - 1 ? "" : " ");
        }
        cout << "\n";
    }
    return 0;
}
