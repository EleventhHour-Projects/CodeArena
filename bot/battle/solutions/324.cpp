#include <iostream>
#include <vector>

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
    vector<int> onesRow(m, 0), onesCol(n, 0);
    for (int i = 0; i < m; i++)
        for (int j = 0; j < n; j++)
            if (grid[i][j] == 1) { onesRow[i]++; onesCol[j]++; }
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            if (j) cout << ' ';
            int zerosRow = n - onesRow[i];
            int zerosCol = m - onesCol[j];
            cout << onesRow[i] + onesCol[j] - zerosRow - zerosCol;
        }
        cout << "\n";
    }
    return 0;
}
