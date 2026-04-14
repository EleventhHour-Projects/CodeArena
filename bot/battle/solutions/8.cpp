#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    vector<char> letters(n);
    for (int i = 0; i < n; i++) cin >> letters[i];
    char target;
    cin >> target;
    auto it = upper_bound(letters.begin(), letters.end(), target);
    if (it == letters.end()) cout << letters[0] << "\n";
    else cout << *it << "\n";
    return 0;
}
