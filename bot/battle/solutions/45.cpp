#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> heights(n);
    for (int i = 0; i < n; i++) cin >> heights[i];
    vector<int> sorted_h = heights;
    sort(sorted_h.begin(), sorted_h.end());
    int count = 0;
    for (int i = 0; i < n; i++) {
        if (heights[i] != sorted_h[i]) count++;
    }
    cout << count << "\n";
    return 0;
}
