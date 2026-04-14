#include <iostream>
#include <vector>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> students(n);
    int count[2] = {0, 0};
    for (int i = 0; i < n; i++) {
        cin >> students[i];
        count[students[i]]++;
    }
    int m;
    if (!(cin >> m)) return 0;
    vector<int> sandwiches(m);
    for (int i = 0; i < m; i++) cin >> sandwiches[i];
    for (int i = 0; i < m; i++) {
        if (count[sandwiches[i]] > 0) {
            count[sandwiches[i]]--;
        } else {
            cout << (m - i) << "\n";
            return 0;
        }
    }
    cout << "0\n";
    return 0;
}
