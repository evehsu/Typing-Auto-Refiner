from call_openai_api import get_auto_corrected_text, get_tuned_text


def main():
    import sys

    print(sys.path)
    text = "helo how are ou todya?"
    auto_corrected_text = get_auto_corrected_text(text)
    toned_text = get_tuned_text(auto_corrected_text, "formal")
    print(auto_corrected_text)
    print(toned_text)


if __name__ == "__main__":
    main()
