#include <iostream>
#include <vector>
#include <set>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> digits(n);
    int freq[10] = {};
    for (int i = 0; i < n; i++) {
        cin >> digits[i];
        freq[digits[i]]++;
    }
    set<int> results;
    for (int num = 100; num <= 999; num += 2) {
        int d1 = num / 100, d2 = (num / 10) % 10, d3 = num % 10;
        int need[10] = {};
        need[d1]++;
        need[d2]++;
        need[d3]++;
        bool ok = true;
        for (int d = 0; d < 10; d++) {
            if (need[d] > freq[d]) { ok = false; break; }
        }
        if (ok) results.insert(num);
    }
    cout << results.size() << "\n";
    return 0;
}
