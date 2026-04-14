#include <iostream>
#include <string>

using namespace std;

int main() {
    string s;
    if (!(cin >> s)) return 0;
    for (int i = 0; i < s.length(); i++) {
        if (s[i] == '6') {
            s[i] = '9';
            break;
        }
    }
    cout << s << "\n";
    return 0;
}
