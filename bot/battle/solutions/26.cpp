#include <iostream>
#include <string>
#include <unordered_set>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    string s;
    if (!(cin >> s)) return 0;
    unordered_set<char> seen;
    for (char c : s) {
        if (seen.count(c)) {
            cout << c << "\n";
            return 0;
        }
        seen.insert(c);
    }
    return 0;
}
