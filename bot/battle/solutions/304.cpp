#include <iostream>
#include <string>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    string s;
    int k;
    if (!(cin >> s >> k)) return 0;
    string result;
    for (int i = 0; i < (int)s.size(); i += k) {
        int sum = 0;
        for (int j = i; j < i + k && j < (int)s.size(); j++)
            sum += s[j] - 'a';
        result += (char)('a' + sum % 26);
    }
    cout << result << "\n";
    return 0;
}
