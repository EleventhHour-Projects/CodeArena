#include <iostream>
#include <vector>

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
    for (int i = 1; i < m; i++) {
        for (int j = 1; j < n; j++) {
            if (mat[i][j] != mat[i - 1][j - 1]) {
                cout << "false" << "\n";
                return 0;
            }
        }
    }
    cout << "true" << "\n";
    return 0;
}
