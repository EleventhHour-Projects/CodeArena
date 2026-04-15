#include <iostream>
#include <vector>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n, m;
    if (!(cin >> n >> m)) return 0;
    vector<vector<int>> adj(n, vector<int>(n));
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            cin >> adj[i][j];
    vector<bool> visited(n, false);
    int provinces = 0;
    for (int i = 0; i < n; i++) {
        if (!visited[i]) {
            provinces++;
            vector<int> stk = {i};
            visited[i] = true;
            while (!stk.empty()) {
                int u = stk.back(); stk.pop_back();
                for (int j = 0; j < n; j++) {
                    if (adj[u][j] == 1 && !visited[j]) {
                        visited[j] = true;
                        stk.push_back(j);
                    }
                }
            }
        }
    }
    cout << provinces << "\n";
    return 0;
}
