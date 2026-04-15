#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int m, n;
    if (!(cin >> m >> n)) return 0;
    vector<vector<int>> mat(m, vector<int>(n));
    for (int i = 0; i < m; i++)
        for (int j = 0; j < n; j++)
            cin >> mat[i][j];
    int k;
    cin >> k;
    sort(mat.begin(), mat.end(), [&](const vector<int>& a, const vector<int>& b) {
        return a[k] > b[k];
    });
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            if (j) cout << " ";
            cout << mat[i][j];
        }
        cout << "\n";
    }
    return 0;
}
