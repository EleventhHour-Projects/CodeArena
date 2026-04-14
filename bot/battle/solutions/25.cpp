#include <iostream>
#include <vector>
#include <unordered_map>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    // According to testcases, n is the total number of elements
    unordered_map<int, int> freq;
    for (int i = 0; i < n; i++) {
        int x; cin >> x;
        freq[x]++;
    }
    for (auto const& [key, val] : freq) {
        if (val % 2 != 0) {
            cout << "false\n";
            return 0;
        }
    }
    cout << "true\n";
    return 0;
}
