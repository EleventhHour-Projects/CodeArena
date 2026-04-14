#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> ones, twos;
    for (int i = 0; i < n; i++) {
        int x; cin >> x;
        if (x == 1) ones.push_back(i);
        else if (x == 2) twos.push_back(i);
    }
    if (ones.empty() || twos.empty()) {
        cout << "-1\n";
        return 0;
    }
    int min_dist = 1e9;
    for (int i : ones) {
        for (int j : twos) {
            min_dist = min(min_dist, abs(i - j));
        }
    }
    cout << min_dist << "\n";
    return 0;
}
